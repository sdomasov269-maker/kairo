import assert from "node:assert/strict";
import test from "node:test";
import { SourceAggregator } from "./SourceAggregator.ts";
import type { PlaybackCandidate, PlaybackProvider, ProviderResolveInput } from "./types.ts";

const input: ProviderResolveInput = { anime: { id: "anime-1", title: "Example", aliases: [] }, episode: 1 };
const candidate = (id: string, provider: string): PlaybackCandidate => ({
  id,
  provider: { id: provider, name: provider },
  animeId: "anime-1",
  episode: 1,
  stream: { type: "hls", url: `https://media.example/${id}.m3u8` },
});
const provider = (id: string, resolve: PlaybackProvider["resolveEpisode"]): PlaybackProvider => ({ id, name: id, resolveEpisode: resolve });

test("merges candidates from successful providers", async () => {
  const aggregator = new SourceAggregator([
    provider("a", async () => [candidate("a-1", "a")]),
    provider("b", async () => [candidate("b-1", "b")]),
  ]);
  assert.deepEqual((await aggregator.resolve(input)).map((item) => item.id), ["a-1", "b-1"]);
});

test("isolates one provider failure and returns successful candidates", async () => {
  const aggregator = new SourceAggregator([
    provider("a", async () => { throw new Error("unavailable"); }),
    provider("b", async () => [candidate("b-1", "b")]),
  ]);
  assert.deepEqual((await aggregator.resolve(input)).map((item) => item.id), ["b-1"]);
});

test("returns an empty list when all providers fail", async () => {
  const aggregator = new SourceAggregator([
    provider("a", async () => { throw new Error("a failed"); }),
    provider("b", async () => { throw new Error("b failed"); }),
  ]);
  assert.deepEqual(await aggregator.resolve(input), []);
});

test("starts providers concurrently", async () => {
  const started: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const aggregator = new SourceAggregator([
    provider("a", async () => { started.push("a"); await gate; return []; }),
    provider("b", async () => { started.push("b"); release(); return []; }),
  ]);
  await aggregator.resolve(input);
  assert.deepEqual(started, ["a", "b"]);
});
