import assert from "node:assert/strict";
import test from "node:test";
import { SourceScorer } from "./SourceScorer.ts";
import type { PlaybackCandidate, ProviderResolveInput } from "./types.ts";
import "../normalization/policy.test.ts";

const input: ProviderResolveInput = { anime: { id: "anime-1", title: "Example", aliases: [] }, preferredTranslation: "Preferred" };
const candidate = (id: string, quality: number, translation = "Default"): PlaybackCandidate => ({
  id,
  provider: { id: "test", name: "Test" },
  animeId: "anime-1",
  stream: { type: "hls", url: `https://media.example/${id}.m3u8` },
  video: { quality },
  audio: { translation },
  matchConfidence: 0.9,
});

test("ranks 1080p above 720p when other data is equal", () => {
  const ranked = new SourceScorer().rank([candidate("720", 720), candidate("1080", 1080)], input);
  assert.equal(ranked[0]?.candidate.id, "1080");
  assert.ok(ranked[0]!.score > ranked[1]!.score);
});

test("preferred translation receives the centralized bonus", () => {
  const scorer = new SourceScorer();
  const preferred = scorer.score(candidate("preferred", 720, "Preferred"), input);
  const other = scorer.score(candidate("other", 720), input);
  assert.ok(preferred.score > other.score);
  assert.ok(preferred.reasons.includes("preferred translation"));
});

test("equal scores use candidate id for deterministic ordering", () => {
  const ranked = new SourceScorer().rank([candidate("z", 720), candidate("a", 720)], input);
  assert.deepEqual(ranked.map((item) => item.candidate.id), ["a", "z"]);
});
