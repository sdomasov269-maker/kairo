import assert from "node:assert/strict";
import test from "node:test";
import {
  hasMoreSeasonAnime,
  belongsToHomeSeasonWindow,
  mergeSeasonAnimePages,
  rankCurrentSeasonAnime,
  resolveCurrentAnimeSeason,
  resolveNextAnimeSeason,
  selectHomeSeasonWindow,
} from "./current.ts";
import type { Anime } from "../../types/media.ts";

const cases = [
  ["2026-03-31T23:59:59Z", "WINTER", 2026],
  ["2026-04-01T00:00:00Z", "SPRING", 2026],
  ["2026-06-30T23:59:59Z", "SPRING", 2026],
  ["2026-07-01T00:00:00Z", "SUMMER", 2026],
  ["2026-09-30T23:59:59Z", "SUMMER", 2026],
  ["2026-10-01T00:00:00Z", "FALL", 2026],
  ["2026-12-31T23:59:59Z", "FALL", 2026],
  ["2027-01-01T00:00:00Z", "WINTER", 2027],
] as const;

test("resolves every UTC anime season boundary", () => {
  for (const [date, season, year] of cases) {
    assert.deepEqual(resolveCurrentAnimeSeason(new Date(date)), {
      season,
      year,
    });
  }
});

test("resolves the immediate next season without skipping a year", () => {
  assert.deepEqual(resolveNextAnimeSeason(new Date("2026-08-19T12:00:00Z")), {
    season: "FALL",
    year: 2026,
  });
  assert.deepEqual(resolveNextAnimeSeason(new Date("2026-12-19T12:00:00Z")), {
    season: "WINTER",
    year: 2027,
  });
});

test("home window admits only current and next active titles and current finishes", () => {
  const current = { season: "SUMMER" as const, year: 2026 };
  const next = { season: "FALL" as const, year: 2026 };
  assert.equal(belongsToHomeSeasonWindow({ ...anime("airing", 1), season: "SUMMER", year: 2026 }, current, next), true);
  assert.equal(belongsToHomeSeasonWindow({ ...anime("announced", 1), status: "NOT_YET_RELEASED", season: "FALL", year: 2026 }, current, next), true);
  assert.equal(belongsToHomeSeasonWindow({ ...anime("finished", 1), status: "FINISHED", season: "SUMMER", year: 2026, endDate: "2026-08-12" }, current, next), true);
  assert.equal(belongsToHomeSeasonWindow({ ...anime("old", 1), status: "FINISHED", season: "SUMMER", year: 2026, endDate: "2026-06-22" }, current, next), false);
  assert.equal(belongsToHomeSeasonWindow({ ...anime("far", 1), season: "WINTER", year: 2027 }, current, next), false);
});

test("home window reserves space for announced and newly finished titles", () => {
  const window = selectHomeSeasonWindow([
    ...Array.from({ length: 20 }, (_, index) => anime(`ongoing-${index}`, 100 - index)),
    ...Array.from({ length: 10 }, (_, index) => ({ ...anime(`announced-${index}`, 100 - index), status: "NOT_YET_RELEASED" })),
    ...Array.from({ length: 6 }, (_, index) => ({ ...anime(`finished-${index}`, 100 - index), status: "FINISHED" })),
  ]);
  assert.equal(window.length, 24);
  assert.equal(window.filter((item) => item.status === "RELEASING").length, 12);
  assert.equal(window.filter((item) => item.status === "NOT_YET_RELEASED").length, 8);
  assert.equal(window.filter((item) => item.status === "FINISHED").length, 4);
});

test("24 item pages expose load more only while data remains", () => {
  for (const total of [0, 7, 24]) {
    assert.equal(hasMoreSeasonAnime(total, 0, total), false);
  }
  for (const total of [25, 47, 48, 49, 73]) {
    assert.equal(hasMoreSeasonAnime(total, 0, 24), true);
  }
  assert.equal(hasMoreSeasonAnime(25, 24, 1), false);
  assert.equal(hasMoreSeasonAnime(48, 24, 24), false);
  assert.equal(hasMoreSeasonAnime(49, 24, 24), true);
  assert.equal(hasMoreSeasonAnime(49, 48, 1), false);
  assert.equal(hasMoreSeasonAnime(73, 48, 24), true);
  assert.equal(hasMoreSeasonAnime(73, 72, 1), false);
});

test("page merge appends new anime and removes overlapping IDs", () => {
  const first = [anime("a", 3), anime("b", 2)];
  const merged = mergeSeasonAnimePages(first, [anime("b", 2), anime("c", 1)]);
  assert.deepEqual(
    merged.map((item) => item.id),
    ["a", "b", "c"],
  );
});

const anime = (id: string, popularity: number): Anime => ({
  id,
  slug: id,
  title: id,
  tagline: "",
  description: "",
  synopsis: "",
  genres: [],
  status: "RELEASING",
  popularity,
  art: "eclipse",
});

test("catalog refresh deterministically admits a qualifying new title", () => {
  const original = Array.from({ length: 10 }, (_, index) =>
    anime(`anime-${index}`, 100 - index),
  );
  assert.deepEqual(
    rankCurrentSeasonAnime(original).map((item) => item.id),
    rankCurrentSeasonAnime([...original].reverse()).map((item) => item.id),
  );
  const refreshed = rankCurrentSeasonAnime([...original, anime("new", 1000)]);
  assert.equal(refreshed[0].id, "new");
  assert.equal(refreshed.length, 11);
});
