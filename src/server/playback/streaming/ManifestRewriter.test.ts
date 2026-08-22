import assert from "node:assert/strict";
import test from "node:test";
import { rewriteHlsManifest } from "./ManifestRewriter.ts";
import { InMemoryStreamResourceStore } from "./InMemoryStreamResourceStore.ts";

test("rewrites relative, absolute, segment, key, map, media, and iframe URIs", async () => {
  const tokens = Array.from({ length: 8 }, (_, index) => (index + 1).toString(16).repeat(48));
  const store = new InMemoryStreamResourceStore(
    () => new Date("2026-08-21T12:00:00.000Z"),
    () => tokens.shift()!,
  );
  const manifest = [
    "#EXTM3U",
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",URI="audio/index.m3u8"',
    '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=500000,URI="https://cdn.example/iframe.m3u8"',
    "#EXT-X-STREAM-INF:BANDWIDTH=1000000",
    "720/index.m3u8",
    '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
    '#EXT-X-MAP:URI="init.mp4"',
    "#EXTINF:6.0,",
    "seg001.ts",
    "#EXT-X-ENDLIST",
  ].join("\n");
  const rewritten = await rewriteHlsManifest({
    manifest,
    upstreamUrl: "https://cdn.example/root/master.m3u8",
    sessionId: "session-id",
    sessionExpiresAt: new Date("2026-08-21T12:30:00.000Z"),
    resourceStore: store,
  });

  assert.equal(rewritten.includes("cdn.example"), false);
  assert.equal(rewritten.includes("720/index.m3u8"), false);
  assert.equal(rewritten.includes("seg001.ts"), false);
  assert.match(rewritten, /#EXT-X-KEY:METHOD=AES-128,URI="\/api\/stream\/session-id\/resource\/[0-9a-f]+"/);
  assert.match(rewritten, /#EXT-X-MAP:URI="\/api\/stream\/session-id\/resource\/[0-9a-f]+"/);
  assert.match(rewritten, /#EXT-X-MEDIA:[^\n]+URI="\/api\/stream\/session-id\/resource\/[0-9a-f]+"/);
  assert.ok(rewritten.includes("#EXTINF:6.0,"));
  assert.ok(rewritten.includes("#EXT-X-ENDLIST"));
});

test("resolves resource URLs relative to the current nested playlist", async () => {
  const store = new InMemoryStreamResourceStore(undefined, () => "d".repeat(48));
  const rewritten = await rewriteHlsManifest({
    manifest: "#EXTM3U\n#EXTINF:4,\n../segments/one.ts",
    upstreamUrl: "https://cdn.example/variants/720/index.m3u8",
    sessionId: "session-id",
    sessionExpiresAt: new Date(Date.now() + 60_000),
    resourceStore: store,
  });
  const resource = await store.get("session-id", "d".repeat(48));
  assert.equal(resource?.url, "https://cdn.example/variants/segments/one.ts");
  assert.equal(rewritten.includes("https://"), false);
});
