import assert from "node:assert/strict";
import test from "node:test";
import { KodikService } from "../kodik.service.ts";
import { KodikConfigurationError, KodikResponseError } from "./errors.ts";
import { isKodikEpisodeBlocked } from "./normalize.ts";
import { resolveKodikMaterials, kodikTitleAttempts } from "./resolver.ts";
import { kodikResponseSchema } from "./schemas.ts";

const baseMaterial = {
  id: "kodik-1",
  type: "anime-serial",
  link: "https://kodik.info/serial/1",
  title: "Cowboy Bebop",
  title_orig: "Cowboy Bebop",
  translation: { id: 1, title: "Voice One", type: "voice" as const },
  year: 1998,
  shikimori_id: "1",
  blocked_countries: ["XX"],
};

const normalizeLink = (value: string) =>
  value.startsWith("https://kodik.info/") ? value : null;

test("parses the typed Kodik API response and rejects malformed materials", () => {
  assert.equal(
    kodikResponseSchema.parse({ time: "1", total: 1, results: [baseMaterial] })
      .results.length,
    1,
  );
  assert.equal(
    kodikResponseSchema.safeParse({ results: [{ id: "broken" }] }).success,
    false,
  );
});

test("prefers exact shikimori_id without treating AniList or MAL IDs as equivalent", () => {
  const match = resolveKodikMaterials(
    [baseMaterial],
    {
      anilistId: 999,
      malId: 888,
      shikimoriId: 1,
      titles: { english: "Different title" },
    },
    normalizeLink,
  );
  assert.equal(match?.match, "EXACT_EXTERNAL_ID");
  assert.equal(match?.shikimoriId, 1);
});

test("classifies exact title with year and excludes unrelated movie types", () => {
  const match = resolveKodikMaterials(
    [
      { ...baseMaterial, id: "movie", type: "foreign-movie" },
      { ...baseMaterial, shikimori_id: null },
    ],
    { year: 1998, titles: { english: "Cowboy Bebop" } },
    normalizeLink,
  );
  assert.equal(match?.match, "EXACT_TITLE_AND_YEAR");
  assert.equal(match?.type, "anime-serial");
});

test("deduplicates title fallback in locale priority order and bounds attempts", () => {
  assert.deepEqual(
    kodikTitleAttempts({
      titles: {
        russian: "Ковбой Бибоп",
        english: "Cowboy Bebop",
        romaji: "Cowboy Bebop",
        native: "カウボーイビバップ",
        aliases: ["Alias 1", "Alias 2", "Alias 3"],
      },
    }),
    [
      "Ковбой Бибоп",
      "Cowboy Bebop",
      "カウボーイビバップ",
      "Alias 1",
      "Alias 2",
    ],
  );
});

test("groups translations for one anime identity and preserves restrictions", () => {
  const match = resolveKodikMaterials(
    [
      baseMaterial,
      {
        ...baseMaterial,
        id: "kodik-2",
        link: "https://kodik.info/serial/2",
        translation: {
          id: 2,
          title: "Subtitle Two",
          type: "subtitles" as const,
        },
      },
    ],
    { shikimoriId: 1, titles: {} },
    normalizeLink,
  );
  assert.equal(match?.translations.length, 2);
  assert.deepEqual(match?.translations[0]?.blockedCountries, ["XX"]);
  assert.deepEqual(
    match?.translations.map((item) => item.type),
    ["voice", "subtitles"],
  );
});

test("normalizes with_episodes_data seasons and episode metadata", () => {
  const match = resolveKodikMaterials(
    [
      {
        ...baseMaterial,
        blocked_seasons: { "1": ["2"] },
        seasons: {
          "1": {
            link: "https://kodik.info/season/1",
            episodes: {
              "1": "https://kodik.info/episode/1",
              "2": {
                link: "https://kodik.info/episode/2",
                title: "Episode Two",
                screenshots: ["https://kodik.info/screenshot/2.jpg"],
              },
            },
          },
        },
      },
    ],
    { shikimoriId: 1, titles: {} },
    normalizeLink,
  );
  const episodes = match?.translations[0]?.seasons?.[0]?.episodes;
  assert.equal(episodes?.length, 2);
  assert.equal(episodes?.[0]?.blocked, false);
  assert.equal(episodes?.[1]?.blocked, true);
  assert.equal(episodes?.[1]?.title, "Episode Two");
  assert.equal(episodes?.[1]?.screenshots?.length, 1);
});

test("handles every blocked_seasons form deterministically", () => {
  assert.equal(isKodikEpisodeBlocked("all", 1, 1), true);
  assert.equal(isKodikEpisodeBlocked({ "5": "all" }, 5, 1), true);
  assert.equal(isKodikEpisodeBlocked({ "7": ["1", "3"] }, 7, 3), true);
  assert.equal(isKodikEpisodeBlocked({ "7": ["1", "3"] }, 7, 2), false);
});

test("uses sequential title fallback only until a confident match", async () => {
  const requestedTitles: string[] = [];
  const service = new KodikService({
    token: "test-token",
    enabled: true,
    allowedEmbedHosts: "kodik.info",
    maxRetries: 0,
    logger: { info() {}, warn() {}, error() {} },
    fetchImpl: (async (input) => {
      const title = new URL(String(input)).searchParams.get("title") ?? "";
      requestedTitles.push(title);
      return Response.json({
        results: title === "Cowboy Bebop" ? [baseMaterial] : [],
      });
    }) as typeof fetch,
  });
  const match = await service.searchAnime({
    year: 1998,
    titles: { russian: "Ковбой Бибоп", english: "Cowboy Bebop" },
  });
  assert.equal(match?.match, "EXACT_TITLE_AND_YEAR");
  assert.deepEqual(requestedTitles, ["Ковбой Бибоп", "Cowboy Bebop"]);
});

test("detailed playback explicitly requests complete season and episode data", async () => {
  let requestedUrl = "";
  const service = new KodikService({
    token: "test-token",
    enabled: true,
    allowedEmbedHosts: "kodik.info",
    maxRetries: 0,
    logger: { info() {}, warn() {}, error() {} },
    fetchImpl: (async (input) => {
      requestedUrl = String(input);
      return Response.json({ results: [baseMaterial] });
    }) as typeof fetch,
  });
  await service.getAnimePlaybackData({
    shikimoriId: 1,
    titles: { english: "Cowboy Bebop" },
  });
  const params = new URL(requestedUrl).searchParams;
  assert.equal(params.get("with_seasons"), "true");
  assert.equal(params.get("with_episodes"), "true");
  assert.equal(params.get("with_episodes_data"), "true");
});

test("missing token is a controlled configuration error and performs no request", async () => {
  let calls = 0;
  const service = new KodikService({
    enabled: true,
    fetchImpl: (async () => {
      calls += 1;
      return Response.json({ results: [] });
    }) as typeof fetch,
  });
  await assert.rejects(
    service.searchAnime({ titles: { english: "Cowboy Bebop" } }),
    KodikConfigurationError,
  );
  assert.equal(calls, 0);
});

test("malformed API material raises a typed response error", async () => {
  const service = new KodikService({
    token: "test-token",
    enabled: true,
    allowedEmbedHosts: "kodik.info",
    maxRetries: 0,
    logger: { info() {}, warn() {}, error() {} },
    fetchImpl: (async () =>
      Response.json({ results: [{ link: 42 }] })) as typeof fetch,
  });
  await assert.rejects(
    service.searchAnime({ titles: { english: "Cowboy Bebop" } }),
    KodikResponseError,
  );
});

test("request URL and logs never expose the token", async () => {
  const token = "never-log-this-token";
  const logs: unknown[] = [];
  let requestedUrl = "";
  const service = new KodikService({
    token,
    enabled: true,
    allowedEmbedHosts: "kodik.info",
    maxRetries: 0,
    logger: {
      info: (...args: unknown[]) => void logs.push(args),
      warn: (...args: unknown[]) => void logs.push(args),
      error: (...args: unknown[]) => void logs.push(args),
    },
    fetchImpl: (async (input) => {
      requestedUrl = String(input);
      return Response.json({ results: [] });
    }) as typeof fetch,
  });
  await service.searchAnime({ shikimoriId: 1, titles: {} });
  assert.equal(new URL(requestedUrl).searchParams.get("token"), token);
  assert.equal(JSON.stringify(logs).includes(token), false);
});
