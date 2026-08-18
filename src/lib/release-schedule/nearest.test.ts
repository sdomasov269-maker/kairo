import assert from "node:assert/strict";
import test from "node:test";
import { getNearestReleaseDay } from "./nearest.ts";
import type { ReleaseScheduleItem } from "./types.ts";

const from = new Date("2026-08-16T18:00:00Z");
const item = (date: string, episode: number) =>
  ({
    anime: { id: String(episode) },
    episode,
    airingAt: new Date(date).getTime() / 1000,
  }) as ReleaseScheduleItem;

test("prefers today even when tomorrow has more releases", () => {
  const result = getNearestReleaseDay(
    [
      item("2026-08-16T09:00:00Z", 1),
      item("2026-08-17T09:00:00Z", 2),
      item("2026-08-17T10:00:00Z", 3),
    ],
    from,
  );
  assert.equal(result?.dayOffset, 0);
  assert.equal(result?.releases.length, 1);
});
test("selects tomorrow and sorts its releases", () => {
  const result = getNearestReleaseDay(
    [item("2026-08-17T10:00:00Z", 2), item("2026-08-17T09:00:00Z", 1)],
    from,
  );
  assert.equal(result?.dayOffset, 1);
  assert.deepEqual(
    result?.releases.map((release) => release.episode),
    [1, 2],
  );
});
test("searches forward without mixing days", () => {
  const result = getNearestReleaseDay(
    [item("2026-08-18T09:00:00Z", 1), item("2026-08-19T09:00:00Z", 2)],
    from,
  );
  assert.equal(result?.date, "2026-08-18");
  assert.equal(result?.releases.length, 1);
});
test("returns null only after the whole window is empty", () => {
  assert.equal(
    getNearestReleaseDay([item("2026-08-24T09:00:00Z", 1)], from, 7),
    null,
  );
});
