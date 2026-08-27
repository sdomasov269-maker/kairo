import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseBestTmdbBackdrop,
  scoreTmdbBackdrop,
} from "./hero-image-scoring";

test("rejects portrait and sub-1920 TMDB artwork", () => {
  assert.equal(
    scoreTmdbBackdrop({
      file_path: "/a.jpg",
      width: 1280,
      height: 720,
      aspect_ratio: 1.78,
    }),
    -Infinity,
  );
  assert.equal(
    scoreTmdbBackdrop({
      file_path: "/b.jpg",
      width: 2160,
      height: 3000,
      aspect_ratio: 0.72,
    }),
    -Infinity,
  );
});

test("prefers high resolution language-neutral landscape artwork", () => {
  const best = chooseBestTmdbBackdrop([
    {
      file_path: "/text.jpg",
      width: 3840,
      height: 2160,
      aspect_ratio: 1.78,
      iso_639_1: "en",
      vote_average: 8,
      vote_count: 20,
    },
    {
      file_path: "/clean.jpg",
      width: 3840,
      height: 2160,
      aspect_ratio: 1.78,
      iso_639_1: null,
      vote_average: 7,
      vote_count: 12,
    },
  ]);
  assert.equal(best?.image.file_path, "/clean.jpg");
});
