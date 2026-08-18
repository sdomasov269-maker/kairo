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
import {
  enrichAnimeListWithLocalizedTitles,
  enrichAnimeWithLocalizedTitles,
} from "@/server/services/anime-title-enrichment.service";
import { getRuntimeAnime, getRuntimeMalAnime } from "./runtime-catalog";
import {
  findAnimeByAniListId,
  findAnimeBySlug,
  findRelatedAnime,
} from "@/server/repositories/anime.repository";
import { findDatabaseAnimeForRoute } from "./local-first";

const titleFromSlug = (slug: string) =>
  slug
    .replace(/^(?:anilist|mal)-\d+-?/, "")
    .split("-")
    .filter(Boolean)
    .join(" ");

function logAnimeResolution(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development")
    console.info(`[Anime resolver] ${event}`, details);
}

async function resolveAnimeBySlugUncached(slug: string): Promise<Anime | null> {
  if (!slug || slug.length > 120) return null;
  const routeAniListId = extractAniListId(slug);
  logAnimeResolution("start", { slug, anilistId: routeAniListId });
  let databaseAnime: Anime | null;
  try {
    databaseAnime = await findDatabaseAnimeForRoute(slug, routeAniListId, {
      bySlug: findAnimeBySlug,
      byAniListId: findAnimeByAniListId,
    });
  } catch (error) {
    logAnimeResolution("database-error", {
      anilistId: routeAniListId,
      type: error instanceof Error ? error.name : typeof error,
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
      anilistRequested: false,
      snapshotFallback: false,
    });
    throw error;
  }
  if (databaseAnime) {
    logAnimeResolution("resolved", {
      anilistId: databaseAnime.anilistId,
      source: "database",
      snapshotFallback: false,
    });
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
      logAnimeResolution("resolved", {
        anilistId: local.anilistId,
        source: "anilist",
        snapshotFallback: false,
      });
      const anime = applyCanonicalTitleLocalization(
        mergeAniListAnime(local, remote),
      );
      await writeAnimeSnapshot(anime);
      return enrichAnimeWithLocalizedTitles(anime);
    } catch (error) {
      if (error instanceof AniListRequestError) {
        const snapshot = await readAnimeSnapshot(local.anilistId);
        if (snapshot) {
          logAnimeResolution("fallback", {
            anilistId: local.anilistId,
            source: "snapshot",
            snapshotFallback: true,
          });
          return enrichAnimeWithLocalizedTitles(snapshot);
        }
        const backup = await getJikanAnimeBySearch(local.title);
        if (backup.ok && backup.data) {
          logAnimeResolution("fallback", {
            anilistId: local.anilistId,
            source: "jikan-search",
            snapshotFallback: false,
          });
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
        logAnimeResolution("fallback", {
          anilistId: local.anilistId,
          source: "local-catalog",
          snapshotFallback: false,
        });
        return enrichAnimeWithLocalizedTitles(local);
      }
      throw error;
    }
  }
  const malId = extractMalId(slug);
  if (malId) {
    const remembered = getRuntimeMalAnime(malId);
    if (remembered) {
      logAnimeResolution("fallback", {
        malId,
        source: "runtime-cache",
        snapshotFallback: false,
      });
      return enrichAnimeWithLocalizedTitles(remembered);
    }
    const snapshot = await readMalAnimeSnapshot(malId);
    if (snapshot) {
      logAnimeResolution("fallback", {
        malId,
        source: "snapshot",
        snapshotFallback: true,
      });
      return enrichAnimeWithLocalizedTitles(snapshot);
    }
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
    logAnimeResolution("resolved", {
      anilistId,
      source: "anilist",
      snapshotFallback: false,
    });
    const anime = applyCanonicalTitleLocalization(mapAniListAnime(remote));
    await writeAnimeSnapshot(anime);
    return enrichAnimeWithLocalizedTitles(anime);
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    const remembered = getRuntimeAnime(anilistId);
    if (remembered) {
      logAnimeResolution("fallback", {
        anilistId,
        source: "runtime-cache",
        snapshotFallback: false,
      });
      return enrichAnimeWithLocalizedTitles(remembered);
    }
    const snapshot = await readAnimeSnapshot(anilistId);
    if (snapshot) {
      logAnimeResolution("fallback", {
        anilistId,
        source: "snapshot",
        snapshotFallback: true,
      });
      return enrichAnimeWithLocalizedTitles(snapshot);
    }
    const backup = await getJikanAnimeBySearch(titleFromSlug(slug));
    if (!backup.ok || !backup.data) {
      logAnimeResolution("fallback-exhausted", {
        anilistId,
        runtimeCache: false,
        snapshotFallback: false,
        jikanStatus: backup.ok ? null : backup.status,
      });
      throw error;
    }
    logAnimeResolution("fallback", {
      anilistId,
      source: "jikan-search",
      snapshotFallback: false,
    });
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
    return enrichAnimeListWithLocalizedTitles(
      related
        .slice(0, 6)
        .map(mapAniListAnime)
        .map(applyCanonicalTitleLocalization),
    );
  } catch (error) {
    if (error instanceof AniListRequestError) return [];
    throw error;
  }
}
