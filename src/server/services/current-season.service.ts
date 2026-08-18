import {
  hasMoreSeasonAnime,
  resolveCurrentAnimeSeason,
  type AnimeSeasonSnapshot,
} from "@/lib/anime-season/current";
import {
  AniListRequestError,
  mapAniListAnime,
  searchAnimeCatalog,
} from "@/lib/anilist";
import type { CatalogFilters } from "@/lib/catalog";
import {
  getPublicCatalogResult,
  type PublicCatalogSource,
} from "@/lib/catalog/public";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import { findAnimeByCalendarSeasonPage } from "@/server/repositories/anime.repository";
import { enrichAnimeListWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";
import type { Anime } from "@/types/media";

export const CURRENT_SEASON_PAGE_SIZE = 24;

export interface CurrentSeasonResult extends AnimeSeasonSnapshot {
  anime: Anime[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  source: PublicCatalogSource | "database";
  status: "loading" | "success" | "empty" | "error";
}

const safeOffset = (value: number, fallback: number, maximum: number) =>
  Number.isInteger(value) && value >= 0 ? Math.min(value, maximum) : fallback;
const safeLimit = (value: number) =>
  Number.isInteger(value) && value > 0
    ? Math.min(value, CURRENT_SEASON_PAGE_SIZE)
    : CURRENT_SEASON_PAGE_SIZE;

export async function getSeasonAnimePage(
  snapshot: AnimeSeasonSnapshot,
  options: { limit?: number; offset?: number } = {},
): Promise<CurrentSeasonResult> {
  const limit = safeLimit(options.limit ?? CURRENT_SEASON_PAGE_SIZE);
  const offset = safeOffset(options.offset ?? 0, 0, 10_000);
  try {
    const local = await findAnimeByCalendarSeasonPage(
      snapshot.season,
      snapshot.year,
      offset,
      limit,
    );
    if (local.total > 0) {
      return {
        ...snapshot,
        anime: local.anime,
        total: local.total,
        offset,
        limit,
        hasMore: hasMoreSeasonAnime(local.total, offset, local.anime.length),
        source: "database",
        status: local.anime.length ? "success" : "empty",
      };
    }
  } catch {
    // The normalized public catalog is the controlled fallback.
  }

  const page = Math.floor(offset / limit) + 1;
  const filters: CatalogFilters = {
    page,
    perPage: limit,
    genres: [],
    year: snapshot.year,
    season: snapshot.season,
    sort: "POPULARITY_DESC",
  };
  try {
    const remote = await searchAnimeCatalog(filters);
    if (remote) {
      const anime = await enrichAnimeListWithLocalizedTitles(
        remote.media.map(mapAniListAnime).map(applyCanonicalTitleLocalization),
      );
      return {
        ...snapshot,
        anime,
        total: remote.pageInfo.total,
        offset,
        limit,
        hasMore: remote.pageInfo.hasNextPage,
        source: "live",
        status: anime.length ? "success" : "empty",
      };
    }
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
  }

  if (offset === 0) {
    const fallback = await getPublicCatalogResult({
      season: snapshot.season,
      seasonYear: snapshot.year,
      sort: "POPULARITY_DESC",
      perPage: limit,
    });
    if (fallback.source !== "unavailable") {
      const anime = fallback.anime.filter(
        (item) =>
          item.season === snapshot.season && item.year === snapshot.year,
      );
      return {
        ...snapshot,
        anime,
        total: anime.length,
        offset,
        limit,
        hasMore: false,
        source: fallback.source,
        status: anime.length ? "success" : "empty",
      };
    }
  }
  return {
    ...snapshot,
    anime: [],
    total: 0,
    offset,
    limit,
    hasMore: false,
    source: "unavailable",
    status: "error",
  };
}

export function getCurrentSeasonAnime(date: Date = new Date()) {
  return getSeasonAnimePage(resolveCurrentAnimeSeason(date));
}
