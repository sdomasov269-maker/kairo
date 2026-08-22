import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryPlaybackSessionStore } from "./InMemoryPlaybackSessionStore.ts";
import type { PlaybackSession } from "./types.ts";

let now = new Date("2026-08-21T12:00:00.000Z");
const session = (id: string, expiresAt = new Date(now.getTime() + 60_000)): PlaybackSession => ({
  id,
  content: { animeId: `anime-${id}`, season: 1, episode: 1 },
  createdAt: new Date(now),
  expiresAt,
  primary: {
    id: `candidate-${id}`,
    provider: { id: "test", name: "Test" },
    animeId: `anime-${id}`,
    stream: { type: "hls", url: "https://media.example/master.m3u8" },
  },
  fallbacks: [],
});

test("stores, reads, and deletes a session", async () => {
  now = new Date("2026-08-21T12:00:00.000Z");
  const store = new InMemoryPlaybackSessionStore(() => now);
  const value = session("one");
  await store.set(value);
  assert.equal(await store.get("one"), value);
  await store.delete("one");
  assert.equal(await store.get("one"), null);
});

test("expired session returns null and is removed lazily", async () => {
  now = new Date("2026-08-21T12:00:00.000Z");
  const store = new InMemoryPlaybackSessionStore(() => now);
  await store.set(session("expired", new Date(now.getTime() + 1_000)));
  now = new Date(now.getTime() + 1_001);
  assert.equal(await store.get("expired"), null);
  now = new Date("2026-08-21T12:00:00.000Z");
  assert.equal(await store.get("expired"), null);
});

test("keeps multiple sessions independent", async () => {
  now = new Date("2026-08-21T12:00:00.000Z");
  const store = new InMemoryPlaybackSessionStore(() => now);
  await store.set(session("one"));
  await store.set(session("two"));
  await store.delete("one");
  assert.equal(await store.get("one"), null);
  assert.equal((await store.get("two"))?.id, "two");
});
