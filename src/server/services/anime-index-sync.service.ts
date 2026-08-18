import type { Anime } from "../../types/media.ts";
import {
  getAnimeByAniListId,
  getAnimeDiscovery,
} from "../../lib/anilist/client.ts";
import { loadAniListIndexPageWithRetry } from "../../lib/anilist/index-retry.ts";
import { mapAniListAnime } from "../../lib/anilist/mappers.ts";
import {
  deduplicateSnapshotAnime,
  readAllAnimeSnapshots,
} from "../../lib/anime-index/snapshot-source.ts";
import {
  mapCatalogAnimeToIndexRecord,
  validateAnimeIndexRecord,
} from "../../lib/anime-index/normalize.ts";
import type { AnimeIndexRecord } from "../../lib/anime-index/types.ts";
import {
  getExistingAnimeMap,
  upsertAnimeIndexBatch,
  type AnimeIndexWriteMode,
} from "../repositories/anime-index.repository.ts";

export type AnimeIndexSource = "snapshot" | "catalog" | "anilist";
export type AnimeIndexSyncOptions = {
  source?: AnimeIndexSource;
  limit: number;
  offset: number;
  page: number;
  pages: number;
  anilistId?: number;
  batchSize: number;
  dryRun: boolean;
  mode: AnimeIndexWriteMode;
  requestDelayMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  onPageCompleted?: (page: number, processed: number) => Promise<void>;
};

export async function discoverAnimeIndexSource(options: AnimeIndexSyncOptions) {
  const snapshots = await readAllAnimeSnapshots();
  const selectedSource: AnimeIndexSource =
    options.source ?? (snapshots.length ? "snapshot" : "catalog");
  if (selectedSource === "snapshot") {
    const deduplicated = deduplicateSnapshotAnime(snapshots);
    const matching = options.anilistId
      ? deduplicated.unique.filter(
          (item) => item.anilistId === options.anilistId,
        )
      : deduplicated.unique;
    return {
      source: selectedSource,
      anime: matching.slice(options.offset, options.offset + options.limit),
      rawCount: snapshots.length,
      duplicateAniListIds: deduplicated.duplicateIds,
      repeatedPages: [] as number[],
      emptyPage: false,
    };
  }
  const all: Anime[] = [];
  const seenPages = new Set<string>();
  const repeatedPages: number[] = [];
  let emptyPage = false;
  if (options.anilistId) {
    const item = await getAnimeByAniListId(options.anilistId);
    if (item) all.push(mapAniListAnime(item));
  } else {
    const pageLimit = Math.min(options.pages, 100);
    for (
      let index = 0;
      index < pageLimit && all.length < options.limit + options.offset;
      index += 1
    ) {
      const page = options.page + index;
      const media = await loadAniListIndexPageWithRetry(
        page,
        (currentPage) =>
          getAnimeDiscovery({
            page: currentPage,
            perPage: Math.min(50, options.limit),
          }),
        {
          maxRetries: options.maxRetries ?? 5,
          backoffBaseMs: options.backoffBaseMs ?? 3_000,
          backoffMaxMs: options.backoffMaxMs ?? 60_000,
        },
      );
      if (!media.length) {
        emptyPage = true;
        break;
      }
      const signature = media.map((item) => item.id).join(",");
      if (seenPages.has(signature)) {
        repeatedPages.push(page);
        break;
      }
      seenPages.add(signature);
      all.push(...media.map(mapAniListAnime));
      await options.onPageCompleted?.(page, all.length);
      if (options.requestDelayMs && index + 1 < pageLimit)
        await new Promise((resolve) =>
          setTimeout(resolve, options.requestDelayMs),
        );
    }
  }
  const deduplicated = deduplicateSnapshotAnime(all);
  return {
    source: selectedSource,
    anime: deduplicated.unique.slice(
      options.offset,
      options.offset + options.limit,
    ),
    rawCount: all.length,
    duplicateAniListIds: deduplicated.duplicateIds,
    repeatedPages,
    emptyPage,
  };
}

export async function prepareAnimeIndexSync(options: AnimeIndexSyncOptions) {
  const discovery = await discoverAnimeIndexSource(options);
  const valid: AnimeIndexRecord[] = [];
  const invalid: Array<{
    anime: Pick<Anime, "anilistId" | "slug" | "title">;
    errors: string[];
  }> = [];
  for (const anime of discovery.anime) {
    const validation = validateAnimeIndexRecord(
      mapCatalogAnimeToIndexRecord(anime),
    );
    if (validation.valid) valid.push(validation.record);
    else
      invalid.push({
        anime: {
          anilistId: anime.anilistId,
          slug: anime.slug,
          title: anime.title,
        },
        errors: validation.errors,
      });
  }
  const existing = await getExistingAnimeMap(
    valid.map((record) => record.anilistId),
  );
  const newRecords = valid.filter((record) => !existing.has(record.anilistId));
  const existingRecords = valid.filter((record) =>
    existing.has(record.anilistId),
  );
  const slugGroups = new Map<string, number[]>();
  for (const record of valid)
    slugGroups.set(record.slug, [
      ...(slugGroups.get(record.slug) ?? []),
      record.anilistId,
    ]);
  const duplicateSlugs = [...slugGroups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([slug, ids]) => ({ slug, anilistIds: ids }));
  return {
    ...discovery,
    valid,
    invalid,
    existing,
    newRecords,
    existingRecords,
    duplicateSlugs,
  };
}

export async function executeAnimeIndexSync(
  prepared: Awaited<ReturnType<typeof prepareAnimeIndexSync>>,
  options: AnimeIndexSyncOptions,
) {
  if (options.dryRun)
    return {
      created: 0,
      updated: 0,
      skipped: prepared.existingRecords.length,
      errors: [] as Array<{ anilistId: number; error: string }>,
    };
  const records =
    options.mode === "only-missing" ? prepared.newRecords : prepared.valid;
  const totals = {
    created: 0,
    updated: 0,
    skipped:
      options.mode === "only-missing" ? prepared.existingRecords.length : 0,
    errors: [] as Array<{ anilistId: number; error: string }>,
  };
  for (let offset = 0; offset < records.length; offset += options.batchSize) {
    const batch = records.slice(offset, offset + options.batchSize);
    try {
      const results = await upsertAnimeIndexBatch(batch, options.mode);
      for (const result of results)
        totals[
          result === "created"
            ? "created"
            : result === "updated"
              ? "updated"
              : "skipped"
        ] += 1;
    } catch (error) {
      for (const record of batch)
        totals.errors.push({
          anilistId: record.anilistId,
          error:
            error instanceof Error ? error.message : "Unknown database error",
        });
    }
  }
  return totals;
}
