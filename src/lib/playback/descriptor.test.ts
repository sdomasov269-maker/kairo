import assert from "node:assert/strict";
import test from "node:test";
import { playbackDescriptorSchema } from "./descriptor.ts";

test("accepts a minimal provider-independent descriptor", () => {
  const value = playbackDescriptorSchema.parse({
    provider: "kodik",
    titleId: "53446",
    episode: 1,
    sources: [
      {
        protocol: "hls",
        url: "https://media.example/manifest.m3u8",
        quality: 720,
      },
      { protocol: "mp4", url: "https://media.example/video.mp4", quality: 720 },
    ],
  });
  assert.equal(value.sources[0]?.protocol, "hls");
});

test("rejects non-HTTPS media sources", () => {
  assert.throws(() =>
    playbackDescriptorSchema.parse({
      provider: "kodik",
      titleId: "53446",
      episode: 1,
      sources: [{ protocol: "hls", url: "http://media.example/manifest.m3u8" }],
    }),
  );
});

test("accepts only the validated same-origin CVH relay path", () => {
  const value = playbackDescriptorSchema.parse({
    provider: "animego-cvh",
    titleId: "3591",
    episode: 1,
    sources: [
      {
        protocol: "hls",
        url: "/api/stream/cvh/123456789012345678901234/manifest.m3u8",
      },
    ],
  });
  assert.equal(value.sources[0]?.protocol, "hls");
  assert.throws(() =>
    playbackDescriptorSchema.parse({
      provider: "animego-cvh",
      titleId: "3591",
      episode: 1,
      sources: [
        { protocol: "hls", url: "/api/stream?url=https://example.test" },
      ],
    }),
  );
});
