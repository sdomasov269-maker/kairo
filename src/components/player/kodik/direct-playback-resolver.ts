"use client";

export type PlaybackRequestReason =
  | "initial-load"
  | "episode-change"
  | "translation-change"
  | "quality-change"
  | "manual-retry"
  | "fatal-playback-recovery"
  | "unexpected";

export type PlaybackDescriptor =
  | {
      mode: "direct";
      provider: string;
      sources: { quality: string; url: string; mimeType: string }[];
      skipSegments?: {
        type: "opening" | "ending" | "unknown";
        from: number;
        to: number;
      }[];
    }
  | { mode: "kodik-iframe"; provider: "kodik-iframe"; iframeUrl: string };

type PlaybackIdentity = {
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
  translationId: number;
  sourceId: string;
};

const inFlight = new Map<string, Promise<PlaybackDescriptor>>();
const directCache = new Map<string, PlaybackDescriptor>();
let requestSequence = 0;

export function playbackDedupeKey(identity: PlaybackIdentity) {
  return [
    identity.animeSlug,
    identity.seasonNumber,
    identity.episodeNumber,
    identity.translationId,
    identity.sourceId,
  ].join("|");
}

function logRequest(
  requestId: number,
  identity: PlaybackIdentity,
  reason: PlaybackRequestReason,
  dedupeKey: string,
) {
  console.info("[KairoStreams] REQUEST", {
    requestId,
    animeId: identity.animeSlug,
    season: identity.seasonNumber,
    episode: identity.episodeNumber,
    translationId: identity.translationId,
    reason,
    dedupeKey,
  });
}

export async function resolveDirectPlayback(
  identity: PlaybackIdentity,
  playerLink: string,
  reason: PlaybackRequestReason,
  fetchImpl: typeof fetch = fetch,
  bypassCache = false,
): Promise<PlaybackDescriptor> {
  const dedupeKey = playbackDedupeKey(identity);
  const cached = directCache.get(dedupeKey);
  if (cached && !bypassCache) return cached;
  if (bypassCache) directCache.delete(dedupeKey);

  const existing = inFlight.get(dedupeKey);
  if (existing) return existing;

  const requestId = ++requestSequence;
  const request = fetchImpl("/api/kodik/streams", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerLink }),
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Kodik streams: ${response.status}`);
      if (response.headers.get("x-kairo-playback-debug") === "1")
        logRequest(requestId, identity, reason, dedupeKey);
      const payload = (await response.json()) as PlaybackDescriptor;
      if (payload.mode === "direct" && payload.sources.length) {
        directCache.set(dedupeKey, payload);
      }
      return payload;
    })
    .finally(() => inFlight.delete(dedupeKey));
  inFlight.set(dedupeKey, request);
  return request;
}

export function clearDirectPlaybackClientCache() {
  inFlight.clear();
  directCache.clear();
  requestSequence = 0;
}
