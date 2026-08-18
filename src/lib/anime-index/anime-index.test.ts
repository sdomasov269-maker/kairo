import test from "node:test";
import assert from "node:assert/strict";
import type { Anime } from "../../types/media.ts";
import { deduplicateSnapshotAnime } from "./snapshot-source.ts";
import {
  mapCatalogAnimeToIndexRecord,
  mergeAnimeIndexRecord,
  normalizeAnimeSlug,
  normalizeAnimeStringArray,
  validateAnimeIndexRecord,
} from "./normalize.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  readAnimeIndexCheckpoint,
  writeAnimeIndexCheckpoint,
} from "./checkpoint.ts";

const catalogAnime = (overrides: Partial<Anime> = {}): Anime => ({
  id: "anilist-16498",
  slug: "anilist-16498-attack-on-titan",
  anilistId: 16498,
  malId: 16498,
  title: "Attack on Titan",
  titleEnglish: "Attack on Titan",
  titleRomaji: "Shingeki no Kyojin",
  titleNative: "進撃の巨人",
  tagline: "",
  description: "Story",
  synopsis: "Story",
  genres: ["Action", "Action", "Drama"],
  studios: ["WIT Studio"],
  status: "FINISHED",
  format: "TV",
  year: 2013,
  episodes: 25,
  duration: 24,
  rating: 85,
  popularity: 100,
  art: "eclipse",
  ...overrides,
});

test("maps snapshot/catalog Anime to the local index shape", () => {
  const record = mapCatalogAnimeToIndexRecord(catalogAnime());
  assert.equal(record.anilistId, 16498);
  assert.equal(record.malId, 16498);
  assert.deepEqual(record.genres, ["Action", "Drama"]);
  assert.equal(record.titles.romaji, "Shingeki no Kyojin");
});

test("rejects invalid AniList IDs and title-less records", () => {
  const invalid = mapCatalogAnimeToIndexRecord(
    catalogAnime({
      anilistId: undefined,
      title: "",
      titleEnglish: undefined,
      titleRomaji: undefined,
      titleNative: undefined,
    }),
  );
  const validation = validateAnimeIndexRecord(invalid);
  assert.equal(validation.valid, false);
  if (!validation.valid)
    assert.deepEqual(validation.errors.sort(), [
      "invalid-anilist-id",
      "missing-title",
    ]);
});

test("normalizes arrays without empty values or duplicates", () => {
  assert.deepEqual(
    normalizeAnimeStringArray([" Action ", "action", "", null, "Drama"]),
    ["Action", "Drama"],
  );
});

test("keeps a compatible canonical slug and repairs incompatible slugs", () => {
  assert.equal(
    normalizeAnimeSlug(16498, "anilist-16498-existing", "Attack on Titan"),
    "anilist-16498-existing",
  );
  assert.equal(
    normalizeAnimeSlug(16498, "attack-on-titan", "Attack on Titan"),
    "anilist-16498-attack-on-titan",
  );
});

test("merge is idempotent, preserves good values and does not touch relations", () => {
  const record = mapCatalogAnimeToIndexRecord(
    catalogAnime({ bannerImage: undefined }),
  );
  const existing = {
    slug: record.slug,
    malId: 16498,
    titleRomaji: "Shingeki no Kyojin",
    titleEnglish: "Attack on Titan",
    titleNative: "進撃の巨人",
    synonyms: [],
    format: "TV",
    status: "FINISHED",
    season: null,
    year: 2013,
    episodes: 25,
    duration: 24,
    coverImage: "cover",
    coverImageLarge: "large",
    bannerImage: "admin-banner",
    descriptionEnglish: "Story",
    genres: ["Action"],
    studios: ["WIT Studio"],
    rating: 85,
    popularity: 100,
    localizedTitles: ["preserve"],
  };
  const merged = mergeAnimeIndexRecord(existing, record);
  assert.equal(merged.bannerImage, "admin-banner");
  assert.equal("localizedTitles" in merged, false);
  const repeated = mergeAnimeIndexRecord({ ...existing, ...merged }, record);
  const firstStable = { ...merged };
  const secondStable = { ...repeated };
  Reflect.deleteProperty(firstStable, "sourceUpdatedAt");
  Reflect.deleteProperty(secondStable, "sourceUpdatedAt");
  assert.deepEqual(firstStable, secondStable);
});

test("detects duplicate AniList IDs while keeping the first record", () => {
  const result = deduplicateSnapshotAnime([
    catalogAnime(),
    catalogAnime({ slug: "duplicate" }),
  ]);
  assert.equal(result.unique.length, 1);
  assert.deepEqual(result.duplicateIds, [16498]);
});

test("index checkpoint resumes from the next unfinished page", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "kairo-index-checkpoint-"),
  );
  const file = path.join(directory, "checkpoint.json");
  const checkpoint = {
    source: "anilist" as const,
    startedPage: 1,
    lastCompletedPage: 12,
    nextPage: 13,
    processed: 600,
    created: 550,
    updated: 0,
    timestamp: new Date(0).toISOString(),
  };
  await writeAnimeIndexCheckpoint(checkpoint, file);
  assert.equal((await readAnimeIndexCheckpoint(file))?.nextPage, 13);
  await rm(directory, { recursive: true });
});
