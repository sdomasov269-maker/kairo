import assert from "node:assert/strict";
import test from "node:test";
import { PlaybackResolverService } from "./playback-resolver.service.ts";
import type { DirectPlaybackResolver } from "./types.ts";

const direct = (url = "https://cdn.example/video.m3u8") => ({
  sources: [{ quality: "720", url, mimeType: "application/x-mpegURL" }],
});

async function enabled(run: () => Promise<void>) {
  const previous = process.env.KAIRO_DIRECT_KODIK_PLAYBACK;
  process.env.KAIRO_DIRECT_KODIK_PLAYBACK = "true";
  try { await run(); } finally {
    if (previous === undefined) delete process.env.KAIRO_DIRECT_KODIK_PLAYBACK;
    else process.env.KAIRO_DIRECT_KODIK_PLAYBACK = previous;
  }
}

test("fresh cache and ten parallel callers use one resolver execution", () => enabled(async () => {
  let calls = 0;
  const resolver: DirectPlaybackResolver = { name: "test", resolve: async () => { calls += 1; return direct(); } };
  const service = new PlaybackResolverService([resolver]);
  const results = await Promise.all(Array.from({ length: 10 }, () => service.resolve("https://kodik.info/seria/1")));
  assert.equal(calls, 1);
  assert.ok(results.every((value) => value.mode === "direct"));
  await service.resolve("https://kodik.info/seria/1");
  assert.equal(calls, 1);
}));

test("stale direct survives a transient resolver failure but expired stale does not", () => enabled(async () => {
  let calls = 0;
  const resolver: DirectPlaybackResolver = { name: "test", resolve: async () => { calls += 1; if (calls === 1) return direct(); throw new Error("timeout"); } };
  const service = new PlaybackResolverService([resolver]);
  const link = "https://kodik.info/seria/2";
  const first = await service.resolve(link);
  const cache = (service as unknown as { directCache: Map<string, { cachedAt: number }> }).directCache;
  const entry = [...cache.values()][0];
  entry.cachedAt = Date.now() - 6 * 60_000;
  assert.equal((await service.resolve(link)).mode, "direct");
  entry.cachedAt = Date.now() - 16 * 60_000;
  assert.equal((await service.resolve(link)).mode, "kodik-iframe");
  assert.equal(first.mode, "direct");
}));
