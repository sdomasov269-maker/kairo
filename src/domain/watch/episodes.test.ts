import assert from "node:assert/strict";
import test from "node:test";
import { getEpisodeAvailability } from "./availability.ts";
import { validateMediaUrl } from "./media-url.ts";
import {
  episodeLimitReason,
  executeEpisodeWrite,
  executePlansIndependently,
  expectedEpisodeCount,
  nextEpisodeCheckpoint,
  parseEpisodeSyncArguments,
  planMissingEpisodes,
} from "./episode-sync.ts";
import {
  adjacentEpisodes,
  resolveEpisodeTitle,
  sortEpisodes,
  sortSeasons,
} from "./episode-details.ts";
import { eclipseProtocolCatalog } from "../../data/releases/eclipse-protocol.ts";
import { calculateWatchPercent } from "../../lib/watch-progress/selectors.ts";
import {
  fetchAniListEpisodeSchedule,
  ScheduleRefreshError,
} from "./episode-schedule.ts";
import { summarizeEpisodeIntegrity } from "./episode-integrity.ts";

test("availability requires publication, release time and active source", () => {
  const now = new Date("2026-08-03T12:00:00Z");
  assert.equal(
    getEpisodeAvailability(
      {
        isPublished: false,
        availableAt: null,
        videoSources: [{ isActive: true }],
      },
      now,
    ),
    "UNPUBLISHED",
  );
  assert.equal(
    getEpisodeAvailability(
      {
        isPublished: true,
        availableAt: new Date("2026-08-04T12:00:00Z"),
        videoSources: [],
      },
      now,
    ),
    "COMING_SOON",
  );
  assert.equal(
    getEpisodeAvailability(
      { isPublished: true, availableAt: null, videoSources: [] },
      now,
    ),
    "NO_VIDEO",
  );
  assert.equal(
    getEpisodeAvailability(
      {
        isPublished: true,
        availableAt: null,
        videoSources: [{ isActive: false }],
      },
      now,
    ),
    "SOURCE_DISABLED",
  );
  assert.equal(
    getEpisodeAvailability(
      {
        isPublished: true,
        availableAt: null,
        videoSources: [{ isActive: true }],
      },
      now,
    ),
    "AVAILABLE",
  );
});

test("media URLs reject dangerous protocols and non-allowlisted hosts", () => {
  assert.throws(() =>
    validateMediaUrl("javascript:alert(1)", {
      ANIME_MEDIA_ALLOWED_HOSTS: "cdn.example.com",
    }),
  );
  assert.throws(() =>
    validateMediaUrl("https://evil.example/video.mp4", {
      ANIME_MEDIA_ALLOWED_HOSTS: "cdn.example.com",
    }),
  );
  assert.equal(
    validateMediaUrl("https://cdn.example.com/video.mpd", {
      ANIME_MEDIA_ALLOWED_HOSTS: "cdn.example.com",
    }).hostname,
    "cdn.example.com",
  );
  assert.throws(() =>
    validateMediaUrl("http://localhost/video.mp4", {
      ANIME_MEDIA_ALLOW_LOCALHOST: "false",
    }),
  );
  assert.equal(
    validateMediaUrl("http://localhost/video.mp4", {
      ANIME_MEDIA_ALLOW_LOCALHOST: "true",
    }).hostname,
    "localhost",
  );
});

test("episode sync count is conservative and handles movies and airing anime", () => {
  assert.equal(
    expectedEpisodeCount({
      format: "MOVIE",
      episodes: null,
      status: "FINISHED",
      nextAiringEpisode: null,
    }),
    1,
  );
  assert.equal(
    expectedEpisodeCount({
      format: "TV",
      episodes: 12,
      status: "FINISHED",
      nextAiringEpisode: null,
    }),
    12,
  );
  assert.equal(
    expectedEpisodeCount({
      format: "TV",
      episodes: null,
      status: "RELEASING",
      nextAiringEpisode: 7,
    }),
    7,
  );
  assert.equal(
    expectedEpisodeCount({
      format: "TV",
      episodes: null,
      status: "FINISHED",
      nextAiringEpisode: null,
    }),
    0,
  );
});

test("episode sync defaults to dry-run only when explicitly requested and validates scope", () => {
  const one = parseEpisodeSyncArguments([
    "--anilist-id=1",
    "--dry-run",
    "--refresh-schedule",
  ]);
  assert.equal(one.anilistId, 1);
  assert.equal(one.dryRun, true);
  assert.equal(one.refreshSchedule, true);
  assert.equal(one.maxEpisodesPerAnime, 500);
  const batch = parseEpisodeSyncArguments([
    "--all-missing",
    "--limit=100",
    "--dry-run",
  ]);
  assert.equal(batch.limit, 100);
  assert.throws(() =>
    parseEpisodeSyncArguments(["--all-missing", "--anilist-id=1"]),
  );
  assert.throws(() => parseEpisodeSyncArguments([]));
});

test("mass mode requires apply and dry-run never calls a write", async () => {
  assert.equal(parseEpisodeSyncArguments(["--all-missing"]).dryRun, true);
  assert.equal(
    parseEpisodeSyncArguments(["--all-missing", "--apply"]).dryRun,
    false,
  );
  let writes = 0;
  await executeEpisodeWrite(true, async () => {
    writes += 1;
  });
  assert.equal(writes, 0);
});

test("checkpoint is parsed and ongoing planning publishes only known releases", () => {
  assert.equal(
    parseEpisodeSyncArguments(["--all-missing", "--after-anilist-id=42"])
      .afterAniListId,
    42,
  );
  const planned = planMissingEpisodes(
    {
      format: "TV",
      episodes: 12,
      status: "RELEASING",
      nextAiringEpisode: 4,
      nextAiringAt: 1_800_000_000,
    },
    [1],
  );
  assert.deepEqual(
    planned
      .slice(0, 4)
      .map((item) => [
        item.number,
        item.isPublished,
        Boolean(item.availableAt),
      ]),
    [
      [2, true, false],
      [3, true, false],
      [4, true, true],
      [5, false, false],
    ],
  );
  assert.ok(
    planMissingEpisodes(
      {
        format: "TV",
        episodes: 12,
        status: "RELEASING",
        nextAiringEpisode: null,
        nextAiringAt: null,
      },
      [],
    ).every((item) => !item.isPublished),
  );
});

test("episode ceiling defaults to 500 and supports an explicit full override", () => {
  assert.equal(
    parseEpisodeSyncArguments(["--all-missing"]).maxEpisodesPerAnime,
    500,
  );
  assert.equal(
    parseEpisodeSyncArguments([
      "--anilist-id=1",
      "--max-episodes-per-anime=2000",
    ]).maxEpisodesPerAnime,
    2000,
  );
  assert.equal(episodeLimitReason(501, 500), "episode-limit-exceeded:501>500");
  assert.equal(episodeLimitReason(500, 500), null);
});

test("existing episode numbers make reruns idempotent and Movie stays singular", () => {
  const finished = {
    format: "TV",
    episodes: 3,
    status: "FINISHED",
    nextAiringEpisode: null,
    nextAiringAt: null,
  };
  assert.deepEqual(planMissingEpisodes(finished, [1, 2, 3]), []);
  assert.deepEqual(
    planMissingEpisodes({ ...finished, format: "MOVIE", episodes: 1 }, [1]),
    [],
  );
});

test("checkpoint uses the greatest processed AniList ID", () => {
  assert.equal(nextEpisodeCheckpoint([6, 1, 84, 20]), 84);
  assert.equal(nextEpisodeCheckpoint([], 84), 84);
});

test("integrity summary marks relation and duplicate violations as critical", () => {
  assert.deepEqual(
    summarizeEpisodeIntegrity({ duplicateSeasons: 0, episodeAnimeMismatch: 0 }),
    { critical: 0, valid: true },
  );
  assert.deepEqual(
    summarizeEpisodeIntegrity({ duplicateSeasons: 1, episodeAnimeMismatch: 2 }),
    { critical: 3, valid: false },
  );
});

test("one Anime failure does not stop an independent batch", async () => {
  const results = await executePlansIndependently([1, 2, 3], async (value) => {
    if (value === 2) throw new Error("broken");
    return value;
  });
  assert.deepEqual(
    results.map((result) => result.ok),
    [true, false, true],
  );
});

test("schedule adapter classifies 403, 429, timeout and malformed responses", async () => {
  const failing = (status: number) => async () =>
    new Response("{}", { status });
  await assert.rejects(
    () => fetchAniListEpisodeSchedule(1, failing(403) as typeof fetch),
    (error) =>
      error instanceof ScheduleRefreshError && error.kind === "HTTP_403",
  );
  await assert.rejects(
    () => fetchAniListEpisodeSchedule(1, failing(429) as typeof fetch),
    (error) =>
      error instanceof ScheduleRefreshError && error.kind === "HTTP_429",
  );
  await assert.rejects(
    () =>
      fetchAniListEpisodeSchedule(1, (async () => {
        throw Object.assign(new Error("timeout"), { name: "AbortError" });
      }) as typeof fetch),
    (error) =>
      error instanceof ScheduleRefreshError && error.kind === "TIMEOUT",
  );
  await assert.rejects(
    () =>
      fetchAniListEpisodeSchedule(
        1,
        (async () => new Response("not json")) as typeof fetch,
      ),
    (error) =>
      error instanceof ScheduleRefreshError && error.kind === "MALFORMED",
  );
  await assert.rejects(
    () =>
      fetchAniListEpisodeSchedule(1, (async () =>
        Response.json({
          data: {
            Media: {
              episodes: 12,
              duration: 24,
              status: "RELEASING",
              nextAiringEpisode: null,
            },
          },
        })) as typeof fetch),
    (error) =>
      error instanceof ScheduleRefreshError && error.kind === "NO_NEXT_EPISODE",
  );
});

test("episode title localization follows locale, RU, English and generated fallback", () => {
  assert.equal(
    resolveEpisodeTitle({
      locale: "uk",
      episodeNumber: 2,
      title: "English",
      titleRu: "Русский",
      titleUk: "Український",
    }),
    "Український",
  );
  assert.equal(
    resolveEpisodeTitle({
      locale: "uk",
      episodeNumber: 2,
      title: "English",
      titleRu: "Русский",
    }),
    "Русский",
  );
  assert.equal(
    resolveEpisodeTitle({ locale: "en", episodeNumber: 3 }),
    "Серия 3",
  );
});

test("season and episode ordering plus adjacency use stored records, including gaps", () => {
  assert.deepEqual(
    sortSeasons([
      { number: 2, sortOrder: 1 },
      { number: 1, sortOrder: 1 },
      { number: 3, sortOrder: 0 },
    ]).map((item) => item.number),
    [3, 1, 2],
  );
  assert.deepEqual(
    sortEpisodes([{ number: 9 }, { number: 2 }, { number: 5 }]).map(
      (item) => item.number,
    ),
    [2, 5, 9],
  );
  assert.deepEqual(
    adjacentEpisodes([{ number: 9 }, { number: 2 }, { number: 5 }], 5),
    { previous: { number: 2 }, next: { number: 9 } },
  );
});

test("Eclipse demo remains available and progress is clamped", () => {
  assert.ok(
    eclipseProtocolCatalog.releases.some(
      (release) =>
        release.episodeId === "eclipse-protocol-s1e1" && release.isPublished,
    ),
  );
  assert.ok(
    eclipseProtocolCatalog.releases.some(
      (release) =>
        release.episodeId === "eclipse-protocol-s1e2" && release.isPublished,
    ),
  );
  assert.equal(calculateWatchPercent(200, 100), 100);
  assert.equal(calculateWatchPercent(-10, 100), 0);
});
