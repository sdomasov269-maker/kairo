import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlaybackCandidate } from "../core/types.ts";
import { InMemoryPlaybackSessionStore } from "../session/InMemoryPlaybackSessionStore.ts";
import { PlaybackSessionManager } from "../session/PlaybackSessionManager.ts";
import { InMemoryStreamResourceStore } from "./InMemoryStreamResourceStore.ts";
import { STREAM_MAX_MANIFEST_BYTES } from "./stream-http.ts";
import { StreamProxy } from "./StreamProxy.ts";
import { FilesystemSegmentCache } from "./FilesystemSegmentCache.ts";
import type { SegmentCache } from "./SegmentCache.ts";
import "./FilesystemSegmentCache.test.ts";
import "../../../components/player/engine/KairoPlaybackEngine.test.ts";

const candidate: PlaybackCandidate = {
  id: "kodik-primary",
  provider: { id: "kodik", name: "Kodik" },
  animeId: "anilist-269",
  stream: {
    type: "hls",
    url: "https://cdn.example/master.m3u8",
    headers: { Referer: "https://kodik.example/", Cookie: "provider=secret" },
  },
  video: { quality: 1080 },
  audio: { language: "ru", translation: "Studio Voice", translationType: "voice" },
};

const fallback: PlaybackCandidate = {
  ...candidate,
  id: "kodik-fallback",
  stream: { type: "hls", url: "https://fallback.example/master.m3u8" },
};

function routeUrls(manifest: string) {
  return [...manifest.matchAll(/\/api\/stream\/[^\s\",]+/g)].map((match) => match[0]);
}

async function fixture(segmentCache?: SegmentCache) {
  const sessionStore = new InMemoryPlaybackSessionStore();
  const manager = new PlaybackSessionManager(sessionStore);
  const resources = new InMemoryStreamResourceStore();
  const requests: Array<{ url: string; headers: Headers }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input.toString();
    const headers = new Headers(init?.headers);
    requests.push({ url, headers });
    if (url === candidate.stream.url)
      return new Response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nlevel/playlist.m3u8\n", {
        headers: { "content-type": "application/vnd.apple.mpegurl" },
      });
    if (url === "https://cdn.example/level/playlist.m3u8")
      return new Response("#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"../keys/key.bin\"\n#EXTINF:6,\nsegment-1.ts\n", {
        headers: { "content-type": "application/x-mpegURL" },
      });
    if (url === "https://cdn.example/level/segment-1.ts")
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: headers.has("range") ? 206 : 200,
        headers: {
          "content-type": "video/mp2t",
          "content-length": "4",
          "content-range": "bytes 0-3/4",
          "accept-ranges": "bytes",
          "set-cookie": "upstream=secret",
          server: "private-edge",
        },
      });
    if (url === "https://cdn.example/keys/key.bin")
      return new Response(new Uint8Array([9, 8, 7]), {
        headers: { "content-type": "application/octet-stream" },
      });
    return new Response("missing", { status: 404 });
  };
  const session = await manager.create(
    { animeId: candidate.animeId, season: 1, episode: 1 },
    [candidate, fallback],
  );
  assert.ok(session);
  const proxy = new StreamProxy(manager, resources, {
    fetchImpl,
    validateUrl: async (url) => new URL(url),
    ...(segmentCache ? { segmentCache } : {}),
  });
  return { session, manager, resources, proxy, requests };
}

test("master and nested playlists expose only Kairo resource routes", async () => {
  const { session, proxy, requests } = await fixture();
  const master = await proxy.master(session.id, new Request("http://kairo.test/master"));
  assert.equal(master.status, 200);
  assert.equal(master.headers.get("content-type"), "application/vnd.apple.mpegurl");
  const masterText = await master.text();
  assert.equal(masterText.includes("cdn.example"), false);
  const [nestedPath] = routeUrls(masterText);
  assert.ok(nestedPath);

  const token = nestedPath.split("/").at(-1)!;
  const nested = await proxy.resource(session.id, token, new Request(`http://kairo.test${nestedPath}`));
  const nestedText = await nested.text();
  assert.equal(nested.status, 200);
  assert.equal(nestedText.includes("cdn.example"), false);
  assert.equal(routeUrls(nestedText).length, 2);
  assert.deepEqual(requests.map((entry) => entry.url), [
    "https://cdn.example/master.m3u8",
    "https://cdn.example/level/playlist.m3u8",
  ]);
  assert.equal(requests.some((entry) => entry.url.includes("fallback.example")), false);
});

test("segments stream with safe Range and filtered request and response headers", async () => {
  const { session, proxy, requests } = await fixture();
  const masterText = await (await proxy.master(session.id, new Request("http://kairo.test/master"))).text();
  const nestedPath = routeUrls(masterText)[0]!;
  const nestedText = await (await proxy.resource(
    session.id,
    nestedPath.split("/").at(-1)!,
    new Request(`http://kairo.test${nestedPath}`),
  )).text();
  const segmentPath = routeUrls(nestedText).find((path) => {
    const token = path.split("/").at(-1)!;
    return token.length === 48;
  });
  assert.ok(segmentPath);
  const resources = routeUrls(nestedText);
  const segmentToken = resources.at(-1)!.split("/").at(-1)!;
  const response = await proxy.resource(session.id, segmentToken, new Request(`http://kairo.test${segmentPath}`, {
    headers: { Range: "bytes=0-3", Authorization: "Bearer browser", Cookie: "browser=secret" },
  }));
  assert.equal(response.status, 206);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3, 4]);
  const upstream = requests.at(-1)!;
  assert.equal(upstream.headers.get("range"), "bytes=0-3");
  assert.equal(upstream.headers.get("referer"), "https://kodik.example/");
  assert.equal(upstream.headers.get("cookie"), "provider=secret");
  assert.equal(upstream.headers.has("authorization"), false);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.equal(response.headers.has("server"), false);
  assert.equal(response.headers.get("content-range"), "bytes 0-3/4");
});

test("resource tokens are session-scoped and session expiry is enforced", async () => {
  const { session, manager, proxy } = await fixture();
  const masterText = await (await proxy.master(session.id, new Request("http://kairo.test/master"))).text();
  const token = routeUrls(masterText)[0]!.split("/").at(-1)!;
  const other = await manager.create({ animeId: "other" }, [candidate]);
  assert.ok(other);
  assert.equal((await proxy.resource(other.id, token, new Request("http://kairo.test/resource"))).status, 404);
  assert.equal((await proxy.resource(session.id, "f".repeat(48), new Request("http://kairo.test/resource"))).status, 404);
  await manager.destroy(session.id);
  assert.equal((await proxy.resource(session.id, token, new Request("http://kairo.test/resource"))).status, 404);
});

test("expired sessions invalidate the master route and existing resource tokens", async () => {
  let now = new Date("2026-08-21T12:00:00.000Z");
  const sessionStore = new InMemoryPlaybackSessionStore(() => now);
  const manager = new PlaybackSessionManager(sessionStore, { now: () => now, ttlMs: 1_000 });
  const resources = new InMemoryStreamResourceStore(() => now);
  const session = await manager.create({ animeId: candidate.animeId }, [candidate]);
  assert.ok(session);
  const token = await resources.create({
    sessionId: session.id,
    url: "https://cdn.example/segment.ts",
    kind: "segment",
    createdAt: now,
    expiresAt: session.expiresAt,
  });
  const proxy = new StreamProxy(manager, resources, { validateUrl: async (url) => new URL(url) });
  now = new Date("2026-08-21T12:00:02.000Z");
  assert.equal((await proxy.master(session.id, new Request("http://kairo.test/master"))).status, 404);
  assert.equal((await proxy.resource(session.id, token, new Request("http://kairo.test/resource"))).status, 404);
});

test("oversized manifests fail closed without exposing upstream details", async () => {
  const store = new InMemoryPlaybackSessionStore();
  const manager = new PlaybackSessionManager(store);
  const resources = new InMemoryStreamResourceStore();
  const session = await manager.create({ animeId: candidate.animeId }, [candidate]);
  assert.ok(session);
  const proxy = new StreamProxy(manager, resources, {
    validateUrl: async (url) => new URL(url),
    fetchImpl: async () => new Response("#EXTM3U", {
      headers: { "content-length": String(STREAM_MAX_MANIFEST_BYTES + 1) },
    }),
  });
  const response = await proxy.master(session.id, new Request("http://kairo.test/master"));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "STREAM_UNAVAILABLE" });
});

async function segmentTokenFromFixture(session: { id: string }, proxy: StreamProxy) {
  const masterText = await (await proxy.master(session.id, new Request("http://kairo.test/master"))).text();
  const nestedToken = routeUrls(masterText)[0]!.split("/").at(-1)!;
  const nestedText = await (await proxy.resource(session.id, nestedToken, new Request("http://kairo.test/nested"))).text();
  return { nestedToken, nestedText, segmentToken: routeUrls(nestedText).at(-1)!.split("/").at(-1)! };
}

test("cache-on-demand fetches once, serves Range hits, and returns 416", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kairo-proxy-cache-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { session, proxy, requests } = await fixture(new FilesystemSegmentCache(root));
  const { segmentToken } = await segmentTokenFromFixture(session, proxy);
  const before = requests.length;
  const first = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment"));
  assert.deepEqual([...new Uint8Array(await first.arrayBuffer())], [1, 2, 3, 4]);
  const second = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment"));
  assert.deepEqual([...new Uint8Array(await second.arrayBuffer())], [1, 2, 3, 4]);
  assert.equal(requests.length, before + 1);
  const range = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment", {
    headers: { Range: "bytes=1-2" },
  }));
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("content-range"), "bytes 1-2/4");
  assert.deepEqual([...new Uint8Array(await range.arrayBuffer())], [2, 3]);
  const invalid = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment", {
    headers: { Range: "bytes=10-" },
  }));
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("content-range"), "bytes */4");
  assert.equal(requests.length, before + 1);
});

test("manifests and encryption keys bypass the segment cache", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kairo-proxy-bypass-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { session, proxy, requests } = await fixture(new FilesystemSegmentCache(root));
  const { nestedToken, nestedText } = await segmentTokenFromFixture(session, proxy);
  await proxy.resource(session.id, nestedToken, new Request("http://kairo.test/nested"));
  const keyToken = routeUrls(nestedText)[0]!.split("/").at(-1)!;
  await (await proxy.resource(session.id, keyToken, new Request("http://kairo.test/key"))).arrayBuffer();
  await (await proxy.resource(session.id, keyToken, new Request("http://kairo.test/key"))).arrayBuffer();
  assert.equal(requests.filter((entry) => entry.url.endsWith("playlist.m3u8")).length, 2);
  assert.equal(requests.filter((entry) => entry.url.endsWith("key.bin")).length, 2);
});

test("cache write failure never breaks playback", async () => {
  const failingCache: SegmentCache = {
    get: async () => null,
    set: async () => ({ stored: false, bytes: 0, reason: "write_failed" }),
    deleteSession: async () => undefined,
  };
  const { session, proxy, requests } = await fixture(failingCache);
  const { segmentToken } = await segmentTokenFromFixture(session, proxy);
  const before = requests.length;
  for (let index = 0; index < 2; index += 1) {
    const response = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment"));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3, 4]);
  }
  assert.equal(requests.length, before + 2);
});

test("oversized resources bypass cache and Range misses retain upstream semantics", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kairo-proxy-oversized-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { session, proxy, requests } = await fixture(new FilesystemSegmentCache(root, { maximumBytes: 3 }));
  const { segmentToken } = await segmentTokenFromFixture(session, proxy);
  const before = requests.length;
  const ranged = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment", {
    headers: { Range: "bytes=0-3" },
  }));
  assert.equal(ranged.status, 206);
  assert.deepEqual([...new Uint8Array(await ranged.arrayBuffer())], [1, 2, 3, 4]);
  for (let index = 0; index < 2; index += 1) {
    const response = await proxy.resource(session.id, segmentToken, new Request("http://kairo.test/segment"));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3, 4]);
  }
  assert.equal(requests.length, before + 3);
});
