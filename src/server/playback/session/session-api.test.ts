import assert from "node:assert/strict";
import test from "node:test";
import type { Anime } from "@/types/media";
import { handleCreatePlaybackSession, type PlaybackSessionApiDependencies } from "./session-api.ts";
import type { PlaybackSession } from "./types.ts";

const anime: Anime = {
  id: "anilist-269",
  slug: "anilist-269-bleach",
  anilistId: 269,
  malId: 269,
  title: "BLEACH",
  tagline: "",
  description: "",
  synopsis: "",
  genres: [],
  status: "FINISHED",
  art: "eclipse",
};

const session: PlaybackSession = {
  id: "5ba40943-8e49-41ce-a570-e7b6329bca9c",
  content: { animeId: anime.id, season: 1, episode: 1 },
  createdAt: new Date("2026-08-21T12:00:00.000Z"),
  expiresAt: new Date("2026-08-21T12:30:00.000Z"),
  primary: {
    id: "kodik-primary",
    provider: { id: "kodik", name: "Kodik" },
    animeId: anime.id,
    stream: {
      type: "hls",
      url: "https://signed.example/master.m3u8?token=secret",
      headers: { Authorization: "Bearer secret", Cookie: "session=secret" },
    },
    video: { quality: 1080 },
    audio: { language: "ru", translation: "Studio Voice", translationType: "voice" },
  },
  fallbacks: [],
};

const request = (body: unknown) =>
  new Request("http://localhost/api/playback/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const dependencies = (overrides: Partial<PlaybackSessionApiDependencies> = {}): PlaybackSessionApiDependencies => ({
  resolveAnime: async () => anime,
  createSession: async () => session,
  ...overrides,
});

test("valid content request creates a safe public session response", async () => {
  let receivedPreferences: unknown;
  const response = await handleCreatePlaybackSession(
    request({ animeId: anime.slug, season: 1, episode: 1, preferredLanguage: "ru" }),
    dependencies({ createSession: async (_anime, preferences) => { receivedPreferences = preferences; return session; } }),
  );
  assert.equal(response.status, 201);
  assert.deepEqual(receivedPreferences, { season: 1, episode: 1, preferredLanguage: "ru" });
  assert.deepEqual(await response.json(), {
    sessionId: session.id,
    stream: `/api/stream/${session.id}/master.m3u8`,
    expiresAt: "2026-08-21T12:30:00.000Z",
    content: { animeId: anime.id, season: 1, episode: 1 },
    selected: { quality: 1080, language: "ru", translation: "Studio Voice" },
  });
});

test("invalid request is 400 and arbitrary URL fields are rejected", async () => {
  assert.equal((await handleCreatePlaybackSession(request({ animeId: "" }), dependencies())).status, 400);
  assert.equal((await handleCreatePlaybackSession(request({ animeId: anime.slug, url: "https://attacker.example" }), dependencies())).status, 400);
});

test("missing anime is 404 and no candidates is 503", async () => {
  const missing = await handleCreatePlaybackSession(request({ animeId: "missing" }), dependencies({ resolveAnime: async () => null }));
  assert.equal(missing.status, 404);
  const unavailable = await handleCreatePlaybackSession(request({ animeId: anime.slug }), dependencies({ createSession: async () => null }));
  assert.equal(unavailable.status, 503);
});

test("public response cannot expose stream URLs or credential-bearing fields", async () => {
  const response = await handleCreatePlaybackSession(request({ animeId: anime.slug }), dependencies());
  const serialized = JSON.stringify(await response.json()).toLowerCase();
  for (const forbidden of ["http://", "https://", "cookie", "authorization", "stream.url", "bearer", "token=secret"])
    assert.equal(serialized.includes(forbidden), false, `public response leaked ${forbidden}`);
});
