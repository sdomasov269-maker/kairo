import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  PrismaClient,
  type Anime,
  type AnimeLocalizedTitle,
  type AnimeTitleLocale,
  type AnimeTitleSource,
  type Prisma,
} from "@prisma/client";
import { normalizeAnimeTitle } from "../src/lib/anime-titles/normalize.ts";
import { shouldReplaceLocalizedTitle } from "../src/lib/anime-titles/policy.ts";
import { ShikimoriTitleProvider } from "../src/lib/anime-titles/providers/shikimori.ts";
import {
  WikidataTitleProvider,
  getWikidataMetrics,
} from "../src/lib/anime-titles/providers/wikidata.ts";
import {
  assertLocalizationStats,
  createLocalizationSyncStats,
  shouldQueryWikidataForRu,
  type AnimeLocalizationResolution,
  type LocaleResolution,
} from "../src/lib/anime-titles/sync-types.ts";
import {
  defaultTitleCheckpointPath,
  readTitleCheckpoint,
  writeTitleCheckpoint,
} from "../src/lib/anime-titles/checkpoint.ts";
import {
  classifyLookup,
  computeNextRetryAt,
  LookupCircuitBreaker,
  RETRYABLE_LOOKUP_STATUSES,
  type LookupCacheStatus,
} from "../src/lib/anime-titles/lookup-cache.ts";
import {
  buildMissingTitleWhere,
  wikidataRuEnabled,
} from "../src/lib/anime-titles/selection.ts";
import type {
  AnimeTitleCandidateInput,
  AnimeTitleSource as Source,
  LocalizedTitleResult,
  ProviderLookup,
} from "../src/lib/anime-titles/types.ts";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const locale = (args.get("locale") ?? "all") as "ru" | "uk" | "all";
if (!["ru", "uk", "all"].includes(locale))
  throw new Error("--locale must be ru, uk or all");
let limit = Math.min(Number(args.get("limit") ?? 100), 5_000);
const offset = Math.max(0, Number(args.get("offset") ?? 0));
const explicitAniListId = args.has("anilist-id")
  ? Number(args.get("anilist-id"))
  : undefined;
const minConfidence = Number(args.get("min-confidence") ?? 80);
const maxAttempts = Math.max(1, Number(args.get("max-attempts") ?? 5));
const retryBefore = new Date(args.get("retry-before") ?? Date.now());
if (Number.isNaN(retryBefore.getTime()))
  throw new Error("--retry-before must be an ISO date");
const dryRun = args.has("dry-run");
const force = args.has("force");
const onlyMissing = args.has("only-missing");
const retryApiErrors = args.has("retry-api-errors");
const providerArg = args.get("provider");
const fallbackWikidata = args.has("fallback-wikidata");
const skipShikimori = args.has("skip-shikimori") || providerArg === "wikidata";
const skipWikidata = args.has("skip-wikidata") || providerArg === "shikimori";
const allowWikidataRu = wikidataRuEnabled({
  fallbackWikidata,
  provider: providerArg,
  skipWikidata,
});
if (fallbackWikidata) {
  console.warn(
    "Wikidata RU fallback is slow and intended only for small explicit batches.",
  );
  if (!args.has("limit")) limit = 50;
  if (limit > 50)
    throw new Error("--fallback-wikidata requires --limit=50 or less");
}
if (retryApiErrors && locale !== "ru")
  throw new Error("--retry-api-errors currently requires --locale=ru");
const concurrency = retryApiErrors
  ? 1
  : Math.max(1, Math.min(Number(process.env.ANIME_TITLES_CONCURRENCY ?? 1), 4));
const checkpointPath =
  args.get("checkpoint") ||
  defaultTitleCheckpointPath.replace("latest.json", `${locale}.json`);
const checkpoint = args.has("resume")
  ? await readTitleCheckpoint(checkpointPath)
  : null;
if (checkpoint && checkpoint.locale !== locale)
  throw new Error(
    `Checkpoint locale ${checkpoint.locale} does not match --locale=${locale}`,
  );
const afterAniListId = Number(
  args.get("after-anilist-id") ?? checkpoint?.lastProcessedAniListId ?? 0,
);
const stats = createLocalizationSyncStats();
const resolutions: AnimeLocalizationResolution[] = [];
const memoryCache = new Map<string, ProviderLookup>();
const shikimori = new ShikimoriTitleProvider();
const wikidata = new WikidataTitleProvider();
const circuit = new LookupCircuitBreaker(10);
let httpRequests = 0;
let retriedTransient = 0;
let permanentErrors = 0;
const dbLocale = (value: "ru" | "uk") =>
  value.toUpperCase() as AnimeTitleLocale;
const ttlMs: Record<LookupCacheStatus, number> = {
  FOUND: 30 * 864e5,
  NOT_FOUND: 7 * 864e5,
  AMBIGUOUS: 7 * 864e5,
  NOT_ELIGIBLE: 30 * 864e5,
  RATE_LIMITED: 60e3,
  TIMEOUT: 60e3,
  NETWORK_ERROR: 60e3,
  SERVER_ERROR: 60e3,
  CLIENT_ERROR: 7 * 864e5,
  TEMPORARY_ERROR: 60e3,
};

async function lookup(
  provider: "shikimori" | "wikidata",
  input: AnimeTitleCandidateInput,
) {
  const storageProvider = provider === "wikidata" ? "wikidata-v2" : provider;
  const key = `${storageProvider}:${input.anilistId}`;
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  const cached = await prisma.animeTitleLookupCache.findUnique({
    where: {
      anilistId_provider: {
        anilistId: input.anilistId,
        provider: storageProvider,
      },
    },
  });
  const retryingThis = retryApiErrors && provider === "shikimori";
  if (cached && !retryingThis && cached.expiresAt > new Date()) {
    const status =
      cached.status === "FOUND"
        ? "found"
        : cached.status === "AMBIGUOUS"
          ? "ambiguous"
          : cached.status === "NOT_ELIGIBLE"
            ? "not-eligible"
            : cached.retryable
              ? "temporary-error"
              : "not-found";
    const value: ProviderLookup = {
      status,
      results: (cached.results as LocalizedTitleResult[] | null) ?? [],
      diagnostics: {
        cache: "hit",
        ...((cached.metadata as object) ?? {}),
        ...(cached.error ? { error: cached.error } : {}),
      },
    };
    memoryCache.set(key, value);
    return value;
  }
  httpRequests += 1;
  const value = await (
    provider === "shikimori" ? shikimori : wikidata
  ).findTitles(input);
  memoryCache.set(key, value);
  const classified = classifyLookup(value);
  const now = new Date();
  const previousAttempts = cached?.attemptCount ?? 0;
  const attemptCount = classified.retryable
    ? previousAttempts + 1
    : classified.status === "FOUND"
      ? 0
      : previousAttempts + 1;
  const retryAfterMs = Number(value.diagnostics?.retryAfterMs) || null;
  const nextRetryAt = classified.retryable
    ? computeNextRetryAt(attemptCount, now, retryAfterMs)
    : null;
  if (retryingThis && classified.retryable) retriedTransient += 1;
  if (classified.status === "CLIENT_ERROR") permanentErrors += 1;
  if (!dryRun)
    await prisma.animeTitleLookupCache.upsert({
      where: {
        anilistId_provider: {
          anilistId: input.anilistId,
          provider: storageProvider,
        },
      },
      create: {
        anilistId: input.anilistId,
        provider: storageProvider,
        status: classified.status,
        results: value.results as Prisma.InputJsonValue,
        error: classified.error,
        metadata: (value.diagnostics ?? {}) as Prisma.InputJsonValue,
        retryable: classified.retryable,
        attemptCount,
        lastAttemptAt: now,
        nextRetryAt,
        lastHttpStatus: classified.httpStatus,
        expiresAt: new Date(now.getTime() + ttlMs[classified.status]),
      },
      update: {
        status: classified.status,
        results: value.results as Prisma.InputJsonValue,
        error: classified.error,
        metadata: (value.diagnostics ?? {}) as Prisma.InputJsonValue,
        retryable: classified.retryable,
        attemptCount,
        lastAttemptAt: now,
        nextRetryAt,
        lastHttpStatus: classified.httpStatus,
        expiresAt: new Date(now.getTime() + ttlMs[classified.status]),
      },
    });
  circuit.record(classified.status);
  return value;
}

async function save(
  row: Anime,
  existing: AnimeLocalizedTitle | null,
  result: LocalizedTitleResult,
): Promise<LocaleResolution> {
  if (existing?.locked || existing?.source === "MANUAL")
    return { status: "SKIPPED_LOCKED", provider: result.source };
  const replace =
    force ||
    shouldReplaceLocalizedTitle(
      existing
        ? {
            title: existing.title,
            source: existing.source as Source,
            confidence: existing.confidence,
            locked: existing.locked,
          }
        : null,
      result,
      onlyMissing,
    );
  if (!replace)
    return {
      status: "SKIPPED_EXISTING",
      provider: result.source,
      title: existing?.title,
    };
  if (dryRun)
    return {
      status: "FOUND",
      provider: result.source,
      title: result.title,
      saved: false,
    };
  await prisma.$transaction(async (tx) => {
    await tx.animeLocalizedTitle.upsert({
      where: {
        anilistId_locale: {
          anilistId: row.anilistId,
          locale: dbLocale(result.locale),
        },
      },
      create: {
        animeId: row.id,
        anilistId: row.anilistId,
        locale: dbLocale(result.locale),
        title: result.title,
        normalized: normalizeAnimeTitle(result.title),
        source: result.source as AnimeTitleSource,
        confidence: result.confidence,
        externalId: result.externalId,
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      },
      update: {
        title: result.title,
        normalized: normalizeAnimeTitle(result.title),
        source: result.source as AnimeTitleSource,
        confidence: result.confidence,
        externalId: result.externalId,
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    for (const title of result.aliases ?? []) {
      const normalized = normalizeAnimeTitle(title);
      if (!normalized) continue;
      await tx.animeTitleAlias.upsert({
        where: {
          anilistId_normalized: { anilistId: row.anilistId, normalized },
        },
        create: {
          animeId: row.id,
          anilistId: row.anilistId,
          locale: dbLocale(result.locale),
          title,
          normalized,
          source: result.source as AnimeTitleSource,
          externalId: result.externalId,
        },
        update: {},
      });
      stats.aliasesCreated += 1;
    }
  });
  return {
    status: "FOUND",
    provider: result.source,
    title: result.title,
    saved: true,
  };
}

const statusFromLookup = (result: ProviderLookup): LocaleResolution =>
  result.status === "ambiguous"
    ? { status: "AMBIGUOUS" }
    : result.status === "temporary-error"
      ? { status: "API_ERROR" }
      : result.status === "not-eligible"
        ? { status: "NOT_ELIGIBLE" }
        : { status: "NOT_FOUND" };

async function resolveRow(row: Anime): Promise<AnimeLocalizationResolution> {
  const input: AnimeTitleCandidateInput = {
    anilistId: row.anilistId,
    malId: row.malId,
    romaji: row.titleRomaji,
    english: row.titleEnglish,
    native: row.titleNative,
    synonyms: row.synonyms,
    startYear: row.year,
    format: row.format,
    episodes: row.episodes,
    season: row.season,
  };
  const existing = await prisma.animeLocalizedTitle.findMany({
    where: { anilistId: row.anilistId },
  });
  const byLocale = new Map(existing.map((item) => [item.locale, item]));
  let ru: LocaleResolution = { status: "NOT_ELIGIBLE" };
  let uk: LocaleResolution = { status: "NOT_ELIGIBLE" };
  let wikidataLookup: ProviderLookup | null = null;
  if (locale !== "uk") {
    const existingRu = byLocale.get("RU") ?? null;
    if (existingRu)
      ru = {
        status:
          existingRu.locked || existingRu.source === "MANUAL"
            ? "SKIPPED_LOCKED"
            : "SKIPPED_EXISTING",
        title: existingRu.title,
      };
    else if (!skipShikimori) {
      const result = await lookup("shikimori", input);
      if (result.results.length) stats.shikimoriCandidatesFound += 1;
      const exact = result.results.find(
        (item) => item.locale === "ru" && item.confidence >= minConfidence,
      );
      ru = exact
        ? await save(row, existingRu, exact)
        : statusFromLookup(result);
    }
    if (shouldQueryWikidataForRu(ru) && allowWikidataRu) {
      wikidataLookup = await lookup("wikidata", input);
      if (wikidataLookup.results.length) stats.wikidataCandidatesFound += 1;
      const result = wikidataLookup.results.find(
        (item) => item.locale === "ru" && item.confidence >= minConfidence,
      );
      ru = result
        ? await save(row, existingRu, result)
        : statusFromLookup(wikidataLookup);
    }
  }
  if (locale !== "ru") {
    const existingUk = byLocale.get("UK") ?? null;
    if (existingUk)
      uk = {
        status:
          existingUk.locked || existingUk.source === "MANUAL"
            ? "SKIPPED_LOCKED"
            : "SKIPPED_EXISTING",
        title: existingUk.title,
      };
    else if (!skipWikidata) {
      wikidataLookup ??= await lookup("wikidata", input);
      if (wikidataLookup.results.length) stats.wikidataCandidatesFound += 1;
      const result = wikidataLookup.results.find(
        (item) => item.locale === "uk" && item.confidence >= minConfidence,
      );
      uk = result
        ? await save(row, existingUk, result)
        : statusFromLookup(wikidataLookup);
    }
  }
  return { anilistId: row.anilistId, ru, uk };
}

function accumulate(result: AnimeLocalizationResolution) {
  stats.processedAnime += 1;
  for (const [localeKey, resolution] of [
    ["ru", result.ru],
    ["uk", result.uk],
  ] as const) {
    if (
      (locale === "ru" && localeKey === "uk") ||
      (locale === "uk" && localeKey === "ru")
    )
      continue;
    if (
      ["FOUND", "SKIPPED_EXISTING", "SKIPPED_LOCKED"].includes(
        resolution.status,
      )
    ) {
      if (localeKey === "ru") {
        stats.animeWithRussianTitle += 1;
        if (resolution.saved) stats.russianRowsCreated += 1;
      } else {
        stats.animeWithUkrainianTitle += 1;
        if (resolution.saved) stats.ukrainianRowsCreated += 1;
      }
    }
    if (["SKIPPED_EXISTING", "SKIPPED_LOCKED"].includes(resolution.status)) {
      if (localeKey === "ru") stats.russianRowsSkippedExisting += 1;
      else stats.ukrainianRowsSkippedExisting += 1;
    }
    if (resolution.status === "AMBIGUOUS") {
      if (localeKey === "ru") stats.russianAmbiguous += 1;
      else stats.ukrainianAmbiguous += 1;
    }
    if (["NOT_FOUND", "NOT_ELIGIBLE"].includes(resolution.status)) {
      if (localeKey === "ru") stats.russianNotFound += 1;
      else stats.ukrainianNotFound += 1;
    }
    if (resolution.status === "API_ERROR") stats.apiErrors += 1;
  }
}

async function selectRows() {
  let retryIds: number[] | undefined;
  if (retryApiErrors) {
    const caches = await prisma.animeTitleLookupCache.findMany({
      where: {
        provider: "shikimori",
        retryable: true,
        status: { in: [...RETRYABLE_LOOKUP_STATUSES] },
        attemptCount: { lt: maxAttempts },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: retryBefore } }],
      },
      orderBy: [{ anilistId: "asc" }],
      select: { anilistId: true },
    });
    retryIds = caches.map((item) => item.anilistId);
  }
  const clauses: Prisma.AnimeWhereInput[] = [];
  if (explicitAniListId) clauses.push({ anilistId: explicitAniListId });
  else if (afterAniListId) clauses.push({ anilistId: { gt: afterAniListId } });
  if (onlyMissing || retryApiErrors)
    clauses.push(buildMissingTitleWhere(locale));
  if (retryIds) clauses.push({ anilistId: { in: retryIds } });
  return prisma.anime.findMany({
    where: clauses.length ? { AND: clauses } : undefined,
    orderBy: [{ anilistId: "asc" }, { id: "asc" }],
    skip: explicitAniListId || afterAniListId ? 0 : offset,
    take: explicitAniListId ? 1 : limit,
  });
}

async function main() {
  const started = performance.now();
  const rows = await selectRows();
  for (
    let index = 0;
    index < rows.length && (dryRun || !circuit.open);
    index += concurrency
  ) {
    const batch = rows.slice(index, index + concurrency);
    const batchResolutions = await Promise.all(batch.map(resolveRow));
    for (let position = 0; position < batch.length; position += 1) {
      const row = batch[position];
      const resolution = batchResolutions[position];
      resolutions.push(resolution);
      accumulate(resolution);
      assertLocalizationStats(stats);
      if (!dryRun)
        await writeTitleCheckpoint(
          {
            locale,
            lastProcessedAnimeId: row.id,
            lastProcessedAniListId: row.anilistId,
            processed: (checkpoint?.processed ?? 0) + stats.processedAnime,
            saved:
              (checkpoint?.saved ?? 0) +
              stats.russianRowsCreated +
              stats.ukrainianRowsCreated,
            timestamp: new Date().toISOString(),
          },
          checkpointPath,
        );
      console.log(
        `[${stats.processedAnime}/${rows.length}] AniList ${row.anilistId} RU=${resolution.ru.status} UK=${resolution.uk.status}`,
      );
    }
  }
  if (circuit.open)
    console.warn(
      `Circuit breaker opened after ${circuit.failures} consecutive 429/5xx responses; unattempted rows were not modified.`,
    );
  await mkdir("reports/anime-title-sync", { recursive: true });
  const reportPath = `reports/anime-title-sync/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const metrics = getWikidataMetrics();
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        options: Object.fromEntries(args),
        stats,
        retry: {
          selected: rows.length,
          retriedTransient,
          permanentErrors,
          httpRequests,
          circuitOpen: circuit.open,
        },
        metrics,
        resolutions,
      },
      null,
      2,
    ),
  );
  console.log({
    ...stats,
    retry: {
      selected: rows.length,
      retriedTransient,
      permanentErrors,
      httpRequests,
      circuitOpen: circuit.open,
    },
    wikidata: metrics,
    duration: `${((performance.now() - started) / 1000).toFixed(1)}s`,
    report: reportPath,
    dryRun,
  });
}

main()
  .catch((error) => {
    console.error(
      "Title sync failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
