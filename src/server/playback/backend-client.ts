import "server-only";

import type { Anime } from "@/types/media";
import type { PlaybackSource } from "./playback-source";
import type { CreatePlaybackSessionInput } from "./session/session-api";
import type { PlaybackSessionPublic } from "./session/types";

const REQUEST_TIMEOUT_MS = 20_000;

function backendUrl() {
  const value = process.env.KAIRO_PLAYBACK_BACKEND_URL?.trim();
  if (!value) return null;
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("KAIRO_PLAYBACK_BACKEND_URL must use HTTPS in production");
  return url;
}

function publicAnime(anime: Anime) {
  return {
    id: anime.id,
    slug: anime.slug,
    title: anime.title,
    ...(anime.titleEnglish ? { titleEnglish: anime.titleEnglish } : {}),
    ...(anime.titleRomaji ? { titleRomaji: anime.titleRomaji } : {}),
    ...(anime.titleNative ? { titleNative: anime.titleNative } : {}),
    ...(anime.titleRu ? { titleRu: anime.titleRu } : {}),
    ...(anime.titleUk ? { titleUk: anime.titleUk } : {}),
    ...(anime.synonyms ? { synonyms: anime.synonyms } : {}),
    ...(anime.year ? { year: anime.year } : {}),
    ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
    ...(anime.malId ? { malId: anime.malId } : {}),
  };
}

export async function createRemotePlaybackSession(
  anime: Anime,
  preferences: Partial<Omit<CreatePlaybackSessionInput, "animeId">> = {},
  signal?: AbortSignal,
): Promise<PlaybackSessionPublic | null> {
  const base = backendUrl();
  if (!base) return null;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(new URL("/api/playback/session", base), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ animeId: anime.slug, anime: publicAnime(anime), ...preferences }),
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) return null;
  const session = (await response.json()) as PlaybackSessionPublic;
  return /^https:\/\//i.test(session.stream) || process.env.NODE_ENV !== "production"
    ? session
    : null;
}

export async function resolveRemotePlaybackSource(anime: Anime): Promise<PlaybackSource | null> {
  try {
    const session = await createRemotePlaybackSession(anime, { season: 1, episode: 1 });
    return session ? { type: "hls", url: session.stream } : null;
  } catch {
    return null;
  }
}
