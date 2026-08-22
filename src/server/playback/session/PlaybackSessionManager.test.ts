import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryPlaybackSessionStore } from "./InMemoryPlaybackSessionStore.ts";
import { PlaybackSessionManager } from "./PlaybackSessionManager.ts";
import type { PlaybackCandidate } from "../core/types.ts";

const candidate = (id: string): PlaybackCandidate => ({
  id,
  provider: { id: "provider", name: "Provider" },
  animeId: "anime-1",
  stream: { type: "hls", url: `https://media.example/${id}.m3u8` },
});

test("creates an opaque random session with exact primary and fallback order", async () => {
  const now = new Date("2026-08-21T12:00:00.000Z");
  const store = new InMemoryPlaybackSessionStore(() => now);
  const manager = new PlaybackSessionManager(store, { now: () => now, ttlMs: 30_000 });
  const session = await manager.create(
    { animeId: "anime-1", season: 1, episode: 1 },
    [candidate("primary"), candidate("fallback-1"), candidate("fallback-2")],
  );
  assert.ok(session);
  assert.match(session.id, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  assert.equal(session.id.includes("anime-1"), false);
  assert.equal(session.primary.id, "primary");
  assert.deepEqual(session.fallbacks.map((item) => item.id), ["fallback-1", "fallback-2"]);
  assert.equal(session.expiresAt.toISOString(), "2026-08-21T12:00:30.000Z");
});

test("returns null for no candidates and destroy removes a session", async () => {
  const store = new InMemoryPlaybackSessionStore();
  const cleaned: string[] = [];
  const manager = new PlaybackSessionManager(store, {
    createId: () => "opaque-id",
    deleteResources: async (sessionId) => { cleaned.push(sessionId); },
  });
  assert.equal(await manager.create({ animeId: "anime-1" }, []), null);
  const session = await manager.create({ animeId: "anime-1" }, [candidate("primary")]);
  assert.ok(session);
  await manager.destroy(session.id);
  assert.equal(await manager.get(session.id), null);
  assert.deepEqual(cleaned, [session.id]);
});

test("session candidates are snapshots of the ranked input", async () => {
  const manager = new PlaybackSessionManager(new InMemoryPlaybackSessionStore(), { createId: () => "snapshot-id" });
  const ranked = [candidate("primary"), candidate("fallback")];
  const session = await manager.create({ animeId: "anime-1" }, ranked);
  ranked[0]!.stream.url = "https://changed.example/master.m3u8";
  ranked.push(candidate("later"));
  assert.equal(session?.primary.stream.url, "https://media.example/primary.m3u8");
  assert.deepEqual(session?.fallbacks.map((item) => item.id), ["fallback"]);
});
