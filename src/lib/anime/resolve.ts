import "server-only";

import { cache } from "react";
import { getLocalAnimeBySlug } from "@/data/catalog";
import {
  AniListRequestError,
  getAnimeByAniListId,
  getRelatedAnime,
  mapAniListAnime,
  mergeAniListAnime,
} from "@/lib/anilist";
import { extractAniListId, extractMalId } from "@/lib/catalog";
import {
  readAnimeSnapshot,
  readMalAnimeSnapshot,
  writeAnimeSnapshot,
} from "@/lib/catalog/snapshot";
import {
  getJikanAnimeById,
  getJikanAnimeBySearch,
  mapJikanAnime,
} from "@/lib/jikan";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import type { Anime } from "@/types/media";
import { enrichAnimeListWithLocalizedTitles, enrichAnimeWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";
import { getRuntimeAnime, getRuntimeMalAnime } from "./runtime-catalog";
import { findAnimeByAniListId, findAnimeBySlug, findRelatedAnime } from "@/server/repositories/anime.repository";
import { findDatabaseAnimeForRoute } from "./local-first";

const titleFromSlug = (slug: string) =>
  slug
    .replace(/^(?:anilist|mal)-\d+-?/, "")
    .split("-")
    .filter(Boolean)
    .join(" ");

async function resolveAnimeBySlugUncached(slug: string): Promise<Anime | null> {
  if (!slug || slug.length > 120) return null;
  const routeAniListId = extractAniListId(slug);
  const databaseAnime = await findDatabaseAnimeForRoute(slug, routeAniListId, {
    bySlug: findAnimeBySlug,
    byAniListId: findAnimeByAniListId,
  });
  if (databaseAnime) {
    return enrichAnimeWithLocalizedTitles(
      applyCanonicalTitleLocalization(databaseAnime),
    );
  }
  const local = getLocalAnimeBySlug(slug);
  if (local) {
    if (
      local.isDemo &&
      process.env.NODE_ENV === "production" &&
      process.env.SHOW_DEMO_CATALOG !== "true"
    )
      return null;
    if (!local.anilistId) return local;
    try {
      const remote = await getAnimeByAniListId(local.anilistId);
      const anime = applyCanonicalTitleLocalization(
        mergeAniListAnime(local, remote),
      );
      await writeAnimeSnapshot(anime);
      return enrichAnimeWithLocalizedTitles(anime);
    } catch (error) {
      if (error instanceof AniListRequestError) {
        const snapshot = await readAnimeSnapshot(local.anilistId);
        if (snapshot) return enrichAnimeWithLocalizedTitles(snapshot);
        const backup = await getJikanAnimeBySearch(local.title);
        if (backup.ok && backup.data) {
          const mapped = mapJikanAnime(backup.data);
          const anime = applyCanonicalTitleLocalization({
            ...mapped,
            id: local.id,
            slug: local.slug,
            anilistId: local.anilistId,
            titleRu: local.titleRu,
          });
          await writeAnimeSnapshot(anime);
          return enrichAnimeWithLocalizedTitles(anime);
        }
        return enrichAnimeWithLocalizedTitles(local);
      }
      throw error;
    }
  }
  const malId = extractMalId(slug);
  if (malId) {
    const remembered = getRuntimeMalAnime(malId);
    if (remembered) return enrichAnimeWithLocalizedTitles(remembered);
    const snapshot = await readMalAnimeSnapshot(malId);
    if (snapshot) return enrichAnimeWithLocalizedTitles(snapshot);
    const backup = await getJikanAnimeById(malId);
    if (!backup.ok)
      throw new AniListRequestError(
        "All public anime sources are temporarily unavailable",
        backup.status,
        true,
      );
    if (!backup.data) return null;
    const anime = applyCanonicalTitleLocalization(mapJikanAnime(backup.data));
    await writeAnimeSnapshot(anime);
    return enrichAnimeWithLocalizedTitles(anime);
  }
  const anilistId = routeAniListId;
  if (!anilistId) return null;
  try {
    const remote = await getAnimeByAniListId(anilistId);
    if (!remote) return null;
    const anime = applyCanonicalTitleLocalization(mapAniListAnime(remote));
    await writeAnimeSnapshot(anime);
    return enrichAnimeWithLocalizedTitles(anime);
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    const remembered = getRuntimeAnime(anilistId);
    if (remembered) return enrichAnimeWithLocalizedTitles(remembered);
    const snapshot = await readAnimeSnapshot(anilistId);
    if (snapshot) return enrichAnimeWithLocalizedTitles(snapshot);
    const backup = await getJikanAnimeBySearch(titleFromSlug(slug));
    if (!backup.ok || !backup.data) throw error;
    const mapped = mapJikanAnime(backup.data);
    const anime = applyCanonicalTitleLocalization({
      ...mapped,
      id: `anilist-${anilistId}`,
      slug,
      anilistId,
    });
    await writeAnimeSnapshot(anime);
    return enrichAnimeWithLocalizedTitles(anime);
  }
}

export const resolveAnimeBySlug = cache(resolveAnimeBySlugUncached);

export async function resolveRelatedAnime(anime: Anime): Promise<Anime[]> {
  const localRelated = await findRelatedAnime(anime, 6);
  if (localRelated.length) {
    return enrichAnimeListWithLocalizedTitles(
      localRelated.map(applyCanonicalTitleLocalization),
    );
  }
  if (!anime.anilistId) return [];
  try {
    const related = await getRelatedAnime(anime.anilistId);
    return enrichAnimeListWithLocalizedTitles(related
      .slice(0, 6)
      .map(mapAniListAnime)
      .map(applyCanonicalTitleLocalization));
  } catch (error) {
    if (error instanceof AniListRequestError) return [];
    throw error;
  }
}
