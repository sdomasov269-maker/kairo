import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { FilesystemSegmentCache, resolveSegmentCacheRoot } from "./FilesystemSegmentCache.ts";
import { InMemoryStreamResourceStore } from "./InMemoryStreamResourceStore.ts";
import { InMemoryPlaybackSessionStore } from "../session/InMemoryPlaybackSessionStore.ts";
import { PlaybackSessionManager } from "../session/PlaybackSessionManager.ts";
import type { PlaybackCandidate } from "../core/types.ts";

const stream = (data: Uint8Array) => new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(data);
    controller.close();
  },
});

async function temporaryCache(options: ConstructorParameters<typeof FilesystemSegmentCache>[1] = {}) {
  const root = await mkdtemp(join(tmpdir(), "kairo-segment-cache-"));
  return { root, cache: new FilesystemSegmentCache(root, options) };
}

test("default runtime cache root is outside the repository and remains configurable", () => {
  const workspace = resolve("workspace", "kairo");
  const temporaryRoot = resolve("runtime-temp");
  const defaultRoot = resolveSegmentCacheRoot(undefined, temporaryRoot);
  assert.equal(defaultRoot, join(temporaryRoot, "kairo", "playback-cache"));
  assert.equal(defaultRoot.startsWith(`${workspace}${sep}`), false);
  const configuredRoot = resolve("custom", "kairo-cache");
  assert.equal(resolveSegmentCacheRoot(configuredRoot, temporaryRoot), configuredRoot);
});

test("stores metadata and streams bytes with opaque filesystem names", async (t) => {
  const { root, cache } = await temporaryCache();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await cache.set("../../session-a", "https://provider.invalid/signed.ts?token=secret", {
    body: stream(new Uint8Array([1, 2, 3, 4])), declaredLength: 4,
    contentType: "video/mp2t", etag: "opaque-etag",
    lastModified: "Fri, 21 Aug 2026 12:00:00 GMT", createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.deepEqual(result, { stored: true, bytes: 4 });
  const cached = await cache.get("../../session-a", "https://provider.invalid/signed.ts?token=secret");
  assert.ok(cached);
  assert.equal(cached.contentType, "video/mp2t");
  assert.deepEqual([...new Uint8Array(await new Response(cached.stream()).arrayBuffer())], [1, 2, 3, 4]);
  const directories = await readdir(root);
  assert.equal(directories.length, 1);
  assert.match(directories[0]!, /^[0-9a-f]{64}$/);
  const files = await readdir(join(root, directories[0]!));
  assert.equal(files.every((file) => /^[0-9a-f]{64}\.(?:bin|json)$/.test(file)), true);
  const metadata = await readFile(join(root, directories[0]!, files.find((file) => file.endsWith(".json"))!), "utf8");
  assert.equal(/provider|signed|token|cookie|authorization|\.\./i.test(metadata), false);
});

test("isolates sessions, expires entries, removes corruption, and deletes sessions", async (t) => {
  let now = new Date("2026-08-21T12:00:00.000Z");
  const { root, cache } = await temporaryCache({ now: () => now });
  t.after(() => rm(root, { recursive: true, force: true }));
  await cache.set("session-a", "resource", {
    body: stream(new Uint8Array([7, 8, 9])), createdAt: now,
    expiresAt: new Date("2026-08-21T12:00:01.000Z"),
  });
  assert.equal(await cache.get("session-b", "resource"), null);
  assert.ok(await cache.get("session-a", "resource"));
  now = new Date("2026-08-21T12:00:02.000Z");
  assert.equal(await cache.get("session-a", "resource"), null);
  await cache.set("session-a", "resource", {
    body: stream(new Uint8Array([1, 2, 3])), createdAt: now,
    expiresAt: new Date("2026-08-21T12:01:00.000Z"),
  });
  const directory = join(root, (await readdir(root))[0]!);
  const dataFile = (await readdir(directory)).find((file) => file.endsWith(".bin"))!;
  await writeFile(join(directory, dataFile), new Uint8Array([1]));
  assert.equal(await cache.get("session-a", "resource"), null);
  await cache.deleteSession("session-a");
  assert.equal(await stat(directory).then(() => true).catch(() => false), false);
});

test("oversized data is bypassed and leaves no final cache artifact", async (t) => {
  const { root, cache } = await temporaryCache({ maximumBytes: 3 });
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await cache.set("session", "resource", {
    body: stream(new Uint8Array([1, 2, 3, 4])), createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.equal(result.stored, false);
  assert.equal(await cache.get("session", "resource"), null);
  const files = await readdir(root, { recursive: true });
  assert.equal(files.some((file) => file.endsWith(".bin") || file.endsWith(".json")), false);
});

test("session destruction removes resource mappings and cached media", async (t) => {
  const { root, cache } = await temporaryCache();
  t.after(() => rm(root, { recursive: true, force: true }));
  const resources = new InMemoryStreamResourceStore();
  const manager = new PlaybackSessionManager(new InMemoryPlaybackSessionStore(), {
    deleteResources: async (sessionId) => {
      await Promise.all([resources.deleteSession(sessionId), cache.deleteSession(sessionId)]);
    },
  });
  const candidate: PlaybackCandidate = {
    id: "candidate", provider: { id: "provider", name: "Provider" }, animeId: "anime",
    stream: { type: "hls", url: "https://media.example/master.m3u8" },
  };
  const session = await manager.create({ animeId: "anime" }, [candidate]);
  assert.ok(session);
  const token = await resources.create({
    sessionId: session.id, url: "https://media.example/segment.ts", kind: "segment",
    createdAt: session.createdAt, expiresAt: session.expiresAt,
  });
  await cache.set(session.id, token, {
    body: stream(new Uint8Array([1, 2, 3])), createdAt: session.createdAt, expiresAt: session.expiresAt,
  });
  assert.ok(await resources.get(session.id, token));
  assert.ok(await cache.get(session.id, token));
  await manager.destroy(session.id);
  assert.equal(await resources.get(session.id, token), null);
  assert.equal(await cache.get(session.id, token), null);
  assert.deepEqual(await readdir(root), []);
});
