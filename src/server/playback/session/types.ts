import type { PlaybackCandidate } from "../core/types";

export interface PlaybackSession {
  id: string;
  content: {
    animeId: string;
    season?: number;
    episode?: number;
  };
  createdAt: Date;
  expiresAt: Date;
  primary: PlaybackCandidate;
  fallbacks: PlaybackCandidate[];
}

export interface PlaybackSessionPublic {
  sessionId: string;
  expiresAt: string;
  stream: string;
  content: {
    animeId: string;
    season?: number;
    episode?: number;
  };
  selected: {
    quality?: number;
    language?: string;
    translation?: string;
  };
}

export function toPlaybackSessionPublic(session: PlaybackSession): PlaybackSessionPublic {
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
    stream: `/api/stream/${encodeURIComponent(session.id)}/master.m3u8`,
    content: { ...session.content },
    selected: {
      ...(session.primary.video?.quality !== undefined ? { quality: session.primary.video.quality } : {}),
      ...(session.primary.audio?.language ? { language: session.primary.audio.language } : {}),
      ...(session.primary.audio?.translation ? { translation: session.primary.audio.translation } : {}),
    },
  };
}
