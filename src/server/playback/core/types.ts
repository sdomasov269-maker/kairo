export type StreamType = "hls" | "dash" | "mp4";

export interface ProviderResolveInput {
  anime: {
    id: string;
    title: string;
    englishTitle?: string;
    romajiTitle?: string;
    nativeTitle?: string;
    russianTitle?: string;
    ukrainianTitle?: string;
    aliases: string[];
    year?: number;
    anilistId?: number;
    malId?: number;
    shikimoriId?: number;
  };
  season?: number;
  episode?: number;
  preferredTranslation?: string;
  preferredLanguage?: string;
}

export interface PlaybackCandidate {
  id: string;
  provider: { id: string; name: string };
  animeId: string;
  season?: number;
  episode?: number;
  stream: {
    type: StreamType;
    url: string;
    headers?: Record<string, string>;
    expiresAt?: string;
  };
  video?: { quality?: number; codec?: string; bitrate?: number; fps?: number };
  audio?: {
    language?: string;
    translation?: string;
    translationType?: "voice" | "subtitles";
  };
  duration?: number;
  matchConfidence?: number;
  metadata?: { externalId?: string; providerTitle?: string };
  diagnostics?: { resolveLatencyMs?: number; manifestLatencyMs?: number };
}

export interface PlaybackProvider {
  readonly id: string;
  readonly name: string;
  resolveEpisode(input: ProviderResolveInput, signal?: AbortSignal): Promise<PlaybackCandidate[]>;
}

export interface ScoredPlaybackCandidate {
  candidate: PlaybackCandidate;
  score: number;
  reasons: string[];
}
