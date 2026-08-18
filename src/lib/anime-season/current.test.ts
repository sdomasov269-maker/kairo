import assert from "node:assert/strict";
import test from "node:test";
import {
  hasMoreSeasonAnime,
  mergeSeasonAnimePages,
  rankCurrentSeasonAnime,
  resolveCurrentAnimeSeason,
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
