import "server-only";

import { realAnimeCatalog } from "@/data/catalog";
import {
  AniListRequestError,
  getAnimeDiscovery,
  mapAniListAnime,
} from "@/lib/anilist";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import { getJikanDiscovery, mapJikanAnime } from "@/lib/jikan";
import type { Anime } from "@/types/media";
import { enrichAnimeListWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";
import { readCatalogSnapshot, writeCatalogSnapshot } from "./snapshot";

interface PublicCatalogOptions {
  sort?: string;
  status?: string;
  season?: string;
  seasonYear?: number;
  perPage?: number;
}

export type PublicCatalogSource =
  "live" | "snapshot" | "backup" | "unavailable";

export interface PublicCatalogResult {
  anime: Anime[];
  source: PublicCatalogSource;
  snapshotSavedAt?: number;
  errorStatus?: number | null;
}

function snapshotKey(options: PublicCatalogOptions): string {
  return JSON.stringify({
    sort: options.sort ?? "TRENDING_DESC",
    status: options.status ?? null,
    season: options.season ?? null,
    seasonYear: options.seasonYear ?? null,
    perPage: Math.min(options.perPage ?? 50, 50),
  });
}

function deduplicate(anime: Anime[]): Anime[] {
  return [
    ...new Map(
      anime.map((item) => [
        item.anilistId
          ? `anilist:${item.anilistId}`
          : item.malId
            ? `mal:${item.malId}`
            : item.slug,
        item,
      ]),
    ).values(),
  ];
}

export async function getPublicCatalogResult({
  sort = "TRENDING_DESC",
  status,
  season,
  seasonYear,
  perPage = 50,
}: PublicCatalogOptions = {}): Promise<PublicCatalogResult> {
  const key = snapshotKey({ sort, status, season, seasonYear, perPage });
  try {
    const remote = await getAnimeDiscovery({
      sort,
      status,
      season,
      seasonYear,
      perPage: Math.min(perPage, 50),
    });
    const anime = await enrichAnimeListWithLocalizedTitles(
      deduplicate(
        remote.map(mapAniListAnime).map(applyCanonicalTitleLocalization),
      ),
    );
    await writeCatalogSnapshot(key, anime);
    return { anime, source: "live" };
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    const snapshot = await readCatalogSnapshot(key);
    if (snapshot) {
      return {
        anime: await enrichAnimeListWithLocalizedTitles(snapshot.anime),
        source: "snapshot",
        snapshotSavedAt: snapshot.savedAt,
        errorStatus: error.status,
      };
    }
    const backup = await getJikanDiscovery({
      status,
      season,
      seasonYear,
      perPage,
    });
    if (backup.ok) {
      const anime = await enrichAnimeListWithLocalizedTitles(
        deduplicate(
          backup.data.map(mapJikanAnime).map(applyCanonicalTitleLocalization),
        ),
      );
      if (anime.length) {
        await writeCatalogSnapshot(key, anime);
        return { anime, source: "backup", errorStatus: error.status };
      }
    }
    return { anime: [], source: "unavailable", errorStatus: error.status };
  }
}

export async function getPublicCatalog(
  options: PublicCatalogOptions = {},
): Promise<Anime[]> {
  const result = await getPublicCatalogResult(options);
  if (result.source !== "unavailable") return result.anime;
  const { status, season, seasonYear, perPage = 50 } = options;
  return realAnimeCatalog
    .filter((anime) => !status || anime.status === status)
    .filter((anime) => !season || anime.season === season)
    .filter((anime) => !seasonYear || anime.year === seasonYear)
    .slice(0, perPage);
}
