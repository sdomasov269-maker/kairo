import assert from "node:assert/strict";
import test from "node:test";
import type { WatchProgressEntry } from "../../../lib/watch-progress/types.ts";
import {
  getKodikResumePosition,
  shouldPersistKodikProgress,
} from "./kodik-watch-progress.ts";

const progress: WatchProgressEntry = {
  animeSlug: "example",
  seasonNumber: 1,
  episodeNumber: 2,
  currentTime: 120,
  duration: 1_200,
  percent: 10,
  completed: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("progress persistence is throttled to twenty seconds", () => {
  assert.equal(shouldPersistKodikProgress(1_000, 20_999), false);
  assert.equal(shouldPersistKodikProgress(1_000, 21_000), true);
});

test("resume accepts useful progress and rejects completed or edge positions", () => {
  assert.equal(getKodikResumePosition(progress), 120);
  assert.equal(getKodikResumePosition({ ...progress, completed: true }), null);
  assert.equal(getKodikResumePosition({ ...progress, currentTime: 5 }), null);
  assert.equal(
    getKodikResumePosition({ ...progress, currentTime: 1_190 }),
    null,
  );
});
