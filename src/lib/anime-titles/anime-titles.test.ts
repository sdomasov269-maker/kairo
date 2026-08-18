import test from "node:test";
import assert from "node:assert/strict";
import { buildAnimeTitleVariants, normalizeAnimeTitle } from "./normalize.ts";
import { rankAnimeCandidates, scoreAnimeCandidate } from "./matching.ts";
import { resolveDisplayAnimeTitle } from "./display.ts";
import { shouldReplaceLocalizedTitle } from "./policy.ts";
import { ShikimoriTitleProvider } from "./providers/shikimori.ts";
import {
  WikidataTitleProvider,
  getWikidataMetrics,
  resetWikidataCachesForTests,
} from "./providers/wikidata.ts";
import {
  assertLocalizationStats,
  createLocalizationSyncStats,
  isLocaleRequested,
  shouldQueryWikidataForRu,
} from "./sync-types.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readTitleCheckpoint, writeTitleCheckpoint } from "./checkpoint.ts";

const anime = {
  anilistId: 1,
  malId: 1,
  romaji: "Shingeki no Kyojin",
  english: "Attack on Titan",
  native: "進撃の巨人",
  synonyms: ["Attack on Titan!"],
  startYear: 2013,
  format: "TV",
  episodes: 25,
  season: "SPRING",
};

test("normalizes Latin, Cyrillic, Ukrainian, Japanese and punctuation", () => {
  assert.equal(normalizeAnimeTitle("Attack on Titan!"), "attack on titan");
  assert.equal(normalizeAnimeTitle("Атака Титанов"), "атака титанов");
  assert.equal(
    normalizeAnimeTitle("Фрірен: після завершення подорожі"),
    "фрірен після завершення подорожі",
  );
  assert.equal(normalizeAnimeTitle("進撃の巨人"), "進撃の巨人");
  assert.equal(normalizeAnimeTitle("Season 2 — Part 2"), "season 2 part 2");
});

test("builds unique normalized title variants", () => {
  assert.deepEqual(buildAnimeTitleVariants(anime), [
    "進撃の巨人",
    "shingeki no kyojin",
    "attack on titan",
  ]);
});

test("scores strong matches and rejects contradictions", () => {
  const strong = scoreAnimeCandidate(anime, {
    id: "1",
    native: "進撃の巨人",
    english: "Attack on Titan",
    year: 2013,
    format: "TV",
    episodes: 25,
  });
  const wrong = scoreAnimeCandidate(anime, {
    id: "2",
    english: "Attack on Titan",
    year: 2024,
    format: "MOVIE",
    episodes: 1,
  });
  assert.equal(strong, 100);
  assert.ok(wrong < 65);
});

test("detects close ambiguous matches", () => {
  const result = rankAnimeCandidates(anime, [
    {
      id: "1",
      english: "Attack on Titan",
      year: 2013,
      format: "TV",
      episodes: 25,
    },
    {
      id: "2",
      english: "Attack on Titan",
      year: 2013,
      format: "TV",
      episodes: 25,
    },
  ]);
  assert.equal(result.status, "ambiguous");
});

test("resolves locale-specific fallbacks without RU leaking into UK", () => {
  const base = { english: "English", romaji: "Romaji", native: "Native" };
  assert.equal(
    resolveDisplayAnimeTitle({ locale: "ru", localizedRu: "Русское", base }),
    "Русское",
  );
  assert.equal(
    resolveDisplayAnimeTitle({
      locale: "uk",
      localizedRu: "Русское",
      localizedUk: "",
      base,
    }),
    "English",
  );
  assert.equal(resolveDisplayAnimeTitle({ locale: "en", base }), "English");
  assert.equal(
    resolveDisplayAnimeTitle({
      locale: "uk",
      base: { english: null, romaji: null, native: null },
    }),
    "Назва невідома",
  );
});

test("upsert policy protects locked/manual, confidence and idempotency", () => {
  assert.equal(
    shouldReplaceLocalizedTitle(
      { title: "A", source: "SHIKIMORI", confidence: 90, locked: true },
      { title: "B", source: "IMPORTED", confidence: 100 },
    ),
    false,
  );
  assert.equal(
    shouldReplaceLocalizedTitle(
      { title: "A", source: "MANUAL", confidence: 1, locked: false },
      { title: "B", source: "IMPORTED", confidence: 100 },
    ),
    false,
  );
  assert.equal(
    shouldReplaceLocalizedTitle(
      { title: "A", source: "SHIKIMORI", confidence: 95, locked: false },
      { title: "B", source: "WIKIDATA", confidence: 80 },
    ),
    false,
  );
  assert.equal(
    shouldReplaceLocalizedTitle(
      { title: "A", source: "SHIKIMORI", confidence: 90, locked: false },
      { title: "A", source: "SHIKIMORI", confidence: 90 },
    ),
    false,
  );
});

test("Shikimori provider supports injected fetch and does not call live API", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: 1,
        myanimelist_id: 1,
        name: "Shingeki no Kyojin",
        russian: "Атака титанов",
        english: ["Attack on Titan"],
        japanese: ["進撃の巨人"],
        synonyms: [],
        aired_on: "2013-04-07",
        kind: "tv",
        episodes: 25,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const result = await new ShikimoriTitleProvider(mockFetch).findTitles(anime);
  assert.equal(result.results[0]?.title, "Атака титанов");
  assert.equal(result.status, "found");
  assert.equal(result.results[0]?.confidence, 100);
});

test("localization counters enforce per-anime invariants", () => {
  const stats = createLocalizationSyncStats();
  stats.processedAnime = 1;
  stats.animeWithRussianTitle = 1;
  assert.doesNotThrow(() => assertLocalizationStats(stats));
  stats.animeWithRussianTitle = 2;
  assert.throws(() => assertLocalizationStats(stats), /cannot exceed/);
});

test("exact Shikimori RU is final while UK ambiguity stays independent", () => {
  assert.equal(
    shouldQueryWikidataForRu({ status: "FOUND", provider: "SHIKIMORI" }),
    false,
  );
  const resolution = {
    anilistId: 1,
    ru: { status: "FOUND" as const },
    uk: { status: "AMBIGUOUS" as const },
  };
  assert.equal(resolution.ru.status, "FOUND");
  assert.equal(resolution.uk.status, "AMBIGUOUS");
  assert.equal(isLocaleRequested("ru", "uk"), false);
});

test("existing RU does not trigger Wikidata RU", () => {
  assert.equal(shouldQueryWikidataForRu({ status: "SKIPPED_EXISTING" }), false);
  assert.equal(shouldQueryWikidataForRu({ status: "SKIPPED_LOCKED" }), false);
});

test("Wikidata cache hit and negative cache avoid HTTP requests", async () => {
  resetWikidataCachesForTests();
  let calls = 0;
  const emptyFetch: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ search: [] }), { status: 200 });
  };
  const provider = new WikidataTitleProvider(emptyFetch);
  await provider.findTitles(anime);
  await provider.findTitles(anime);
  assert.equal(calls, 1);
  assert.equal(getWikidataMetrics().cacheHits, 1);
});

test("title checkpoint resumes after the last completed AniList ID", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "kairo-title-checkpoint-"),
  );
  const file = path.join(directory, "checkpoint.json");
  const checkpoint = {
    locale: "uk",
    lastProcessedAnimeId: "anime-row",
    lastProcessedAniListId: 12345,
    processed: 500,
    saved: 100,
    timestamp: new Date(0).toISOString(),
  };
  await writeTitleCheckpoint(checkpoint, file);
  assert.deepEqual(await readTitleCheckpoint(file), checkpoint);
  await rm(directory, { recursive: true });
});
