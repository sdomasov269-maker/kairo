import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { disconnectAnimeIndexRepository } from "../src/server/repositories/anime-index.repository.ts";
import {
  executeAnimeIndexSync,
  prepareAnimeIndexSync,
  type AnimeIndexSource,
  type AnimeIndexSyncOptions,
} from "../src/server/services/anime-index-sync.service.ts";
import {
  defaultAnimeIndexCheckpointPath,
  readAnimeIndexCheckpoint,
  writeAnimeIndexCheckpoint,
} from "../src/lib/anime-index/checkpoint.ts";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const positive = (name: string, fallback: number, maximum: number) => {
  const value = Number(args.get(name) ?? fallback);
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;
};
const source = args.get("source") as AnimeIndexSource | undefined;
if (source && !["snapshot", "catalog", "anilist"].includes(source))
  throw new Error("--source must be snapshot, catalog or anilist");
if (args.has("only-missing") && args.has("update-existing"))
  throw new Error("Choose either --only-missing or --update-existing");
const fullMissingRun = args.has("only-missing") && !args.has("limit");
const checkpointPath =
  args.get("checkpoint") || defaultAnimeIndexCheckpointPath;
const resumeCheckpoint = args.has("resume")
  ? await readAnimeIndexCheckpoint(checkpointPath)
  : null;
const startedPage = resumeCheckpoint?.nextPage ?? positive("page", 1, 10_000);
const options: AnimeIndexSyncOptions = {
  source,
  limit: positive("limit", fullMissingRun ? 5_000 : 100, 5_000),
  offset: Math.max(0, Number(args.get("offset") ?? 0)),
  page: startedPage,
  pages: positive("pages", fullMissingRun ? 100 : 1, 100),
  anilistId: args.has("anilist-id")
    ? positive("anilist-id", 0, 999_999_999)
    : undefined,
  batchSize: positive("batch-size", 100, 200),
  dryRun: args.has("dry-run"),
  mode: args.has("update-existing") ? "update-existing" : "only-missing",
  requestDelayMs: positive(
    "request-delay-ms",
    Number(process.env.ANILIST_INDEX_REQUEST_DELAY_MS ?? 1500),
    60_000,
  ),
  maxRetries: positive(
    "max-retries",
    Number(process.env.ANILIST_INDEX_MAX_RETRIES ?? 5),
    10,
  ),
  backoffBaseMs: positive(
    "backoff-base-ms",
    Number(process.env.ANILIST_INDEX_BACKOFF_BASE_MS ?? 3000),
    60_000,
  ),
  backoffMaxMs: positive(
    "backoff-max-ms",
    Number(process.env.ANILIST_INDEX_BACKOFF_MAX_MS ?? 60000),
    300_000,
  ),
  onPageCompleted:
    source === "anilist" && !args.has("dry-run")
      ? async (page, processed) =>
          writeAnimeIndexCheckpoint(
            {
              source: "anilist",
              startedPage: resumeCheckpoint?.startedPage ?? startedPage,
              lastCompletedPage: page,
              nextPage: page + 1,
              processed: (resumeCheckpoint?.processed ?? 0) + processed,
              created: resumeCheckpoint?.created ?? 0,
              updated: resumeCheckpoint?.updated ?? 0,
              timestamp: new Date().toISOString(),
            },
            checkpointPath,
          )
      : undefined,
};

const writeJson = (directory: string, name: string, value: unknown) =>
  writeFile(`${directory}/${name}`, JSON.stringify(value, null, 2));

async function main() {
  const started = performance.now();
  const prepared = await prepareAnimeIndexSync(options);
  const result = await executeAnimeIndexSync(prepared, options);
  if (prepared.source === "anilist" && !options.dryRun) {
    const latest = await readAnimeIndexCheckpoint(checkpointPath);
    if (latest)
      await writeAnimeIndexCheckpoint(
        {
          ...latest,
          created: latest.created + result.created,
          updated: latest.updated + result.updated,
          timestamp: new Date().toISOString(),
        },
        checkpointPath,
      );
  }
  const withMal = prepared.valid.filter((record) => record.malId).length;
  const summary = {
    source: prepared.source,
    dryRun: options.dryRun,
    discovered: prepared.anime.length,
    rawSnapshotRecords: prepared.rawCount,
    valid: prepared.valid.length,
    invalid: prepared.invalid.length,
    new: prepared.newRecords.length,
    existing: prepared.existingRecords.length,
    wouldUpdate:
      options.mode === "update-existing" ? prepared.existingRecords.length : 0,
    skipped: result.skipped,
    withAniListId: prepared.valid.length,
    withMalId: withMal,
    withoutMalId: prepared.valid.length - withMal,
    duplicateAniListIds: prepared.duplicateAniListIds.length,
    duplicateSlugs: prepared.duplicateSlugs.length,
    repeatedPages: prepared.repeatedPages,
    emptyPage: prepared.emptyPage,
    created: result.created,
    updated: result.updated,
    errors: result.errors.length,
    duration: `${((performance.now() - started) / 1000).toFixed(1)}s`,
  };
  const directory = `reports/anime-index-sync/${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeJson(directory, "summary.json", summary),
    writeJson(directory, "invalid-records.json", prepared.invalid),
    writeJson(
      directory,
      "duplicate-anilist-ids.json",
      prepared.duplicateAniListIds,
    ),
    writeJson(directory, "duplicate-slugs.json", prepared.duplicateSlugs),
    writeJson(
      directory,
      "missing-mal-ids.json",
      prepared.valid
        .filter((record) => !record.malId)
        .map((record) => record.anilistId),
    ),
    writeJson(directory, "sync-errors.json", result.errors),
  ]);
  console.log(summary);
  console.log(`Report: ${directory}`);
}

main()
  .catch((error) => {
    console.error(
      "Anime index sync failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => disconnectAnimeIndexRepository());
