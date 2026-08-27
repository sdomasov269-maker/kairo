import assert from "node:assert/strict";
import test from "node:test";
import { formatPlaybackTime } from "./time.ts";

test("formats sub-hour playback time as minutes and seconds", () => {
  assert.equal(formatPlaybackTime(204.9), "03:24");
  assert.equal(formatPlaybackTime(1458), "24:18");
});

test("formats long playback time with hours", () => {
  assert.equal(formatPlaybackTime(6125), "1:42:05");
});

test("handles unavailable media time safely", () => {
  assert.equal(formatPlaybackTime(Number.NaN), "00:00");
  assert.equal(formatPlaybackTime(-1), "00:00");
});
