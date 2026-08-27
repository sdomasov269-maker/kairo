import assert from "node:assert/strict";
import test from "node:test";
import {
  canResumeWatchProgress,
  WATCH_COMPLETION_PERCENT,
  WATCH_RESUME_MIN_SECONDS,
  WATCH_SAVE_INTERVAL_MS,
} from "./policy.ts";

test("watch progress uses one completion and save policy", () => {
  assert.equal(WATCH_COMPLETION_PERCENT, 95);
  assert.equal(WATCH_RESUME_MIN_SECONDS, 5);
  assert.equal(WATCH_SAVE_INTERVAL_MS, 12_000);
});

test("resume accepts unfinished media after the minimum position", () => {
  assert.equal(
    canResumeWatchProgress({
      currentTime: 30,
      duration: 100,
      percent: 30,
      completed: false,
    }),
    true,
  );
});

test("resume rejects completed, near-end and invalid media", () => {
  assert.equal(
    canResumeWatchProgress({
      currentTime: 96,
      duration: 100,
      percent: 96,
      completed: false,
    }),
    false,
  );
  assert.equal(
    canResumeWatchProgress({
      currentTime: 30,
      duration: 100,
      percent: 30,
      completed: true,
    }),
    false,
  );
  assert.equal(
    canResumeWatchProgress({
      currentTime: 2,
      duration: 0,
      percent: 0,
      completed: false,
    }),
    false,
  );
});
