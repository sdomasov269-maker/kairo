import assert from "node:assert/strict";
import test from "node:test";
import { selectContinueWatching } from "./selectors.ts";
import type { WatchProgressEntry } from "./types.ts";

const entry = (
  animeSlug: string,
  episodeNumber: number,
  updatedAt: string,
  overrides: Partial<WatchProgressEntry> = {},
): WatchProgressEntry => ({
  animeSlug,
  seasonNumber: 1,
  episodeNumber,
  currentTime: 25,
  duration: 100,
  percent: 25,
  completed: false,
  updatedAt,
  ...overrides,
});

test("Continue Watching selects one latest unfinished episode per anime", () => {
  const selected = selectContinueWatching([
    entry("bleach", 1, "2026-01-01T00:00:00.000Z"),
    entry("bleach", 2, "2026-01-02T00:00:00.000Z"),
    entry("frieren", 3, "2026-01-03T00:00:00.000Z"),
  ]);
  assert.deepEqual(
    selected.map(({ animeSlug, episodeNumber }) => ({
      animeSlug,
      episodeNumber,
    })),
    [
      { animeSlug: "frieren", episodeNumber: 3 },
      { animeSlug: "bleach", episodeNumber: 2 },
    ],
  );
});

test("Continue Watching excludes completed, near-zero and invalid entries", () => {
  assert.deepEqual(
    selectContinueWatching([
      entry("completed", 1, "2026-01-03T00:00:00.000Z", {
        completed: true,
      }),
      entry("threshold", 1, "2026-01-03T00:00:00.000Z", { percent: 96 }),
      entry("accidental", 1, "2026-01-03T00:00:00.000Z", {
        currentTime: 2,
        percent: 2,
      }),
      entry("invalid", 1, "not-a-date"),
    ]),
    [],
  );
});
