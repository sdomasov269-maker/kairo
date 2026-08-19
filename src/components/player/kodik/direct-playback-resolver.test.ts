import assert from "node:assert/strict";
import test from "node:test";
import {
  clearDirectPlaybackClientCache,
  resolveDirectPlayback,
} from "./direct-playback-resolver.ts";

const identity = {
  animeSlug: "example",
  seasonNumber: 1,
  episodeNumber: 2,
  translationId: 3,
  sourceId: "kodik-4",
};

test("client shares an in-flight request and retains a working direct descriptor", async () => {
  clearDirectPlaybackClientCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        mode: "direct",
        provider: "test",
        sources: [{ quality: "720", url: "https://cdn.example/a.m3u8", mimeType: "application/x-mpegURL" }],
      }),
      { headers: { "x-kairo-playback-debug": "0" } },
    );
  };
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      resolveDirectPlayback(identity, "https://kodik.info/seria/4", "initial-load", fetchImpl),
    ),
  );
  assert.equal(calls, 1);
  assert.ok(results.every((result) => result.mode === "direct"));

  const retained = await resolveDirectPlayback(
    identity,
    "https://kodik.info/seria/4",
    "fatal-playback-recovery",
    async () => {
      throw new Error("a cached direct descriptor must prevent this request");
    },
  );
  assert.equal(retained.mode, "direct");
});
