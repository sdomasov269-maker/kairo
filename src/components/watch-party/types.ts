export type WatchPartyRoomDto = {
  id: string;
  code: string;
  hostUserId: string;
  animeId: string;
  slug: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  translationId: number | null;
  revision: number;
  expiresAt: string;
  host: { displayName: string; image: string | null };
  isHost: boolean;
  channelName: string;
};

export type RealtimeStatus =
  "idle" | "connecting" | "connected" | "reconnecting" | "unavailable";
