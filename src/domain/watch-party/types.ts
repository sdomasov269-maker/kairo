export const WATCH_PARTY_MAX_MEMBERS = 10;
export const WATCH_PARTY_SYNC_INTERVAL_MS = 10_000;
export const WATCH_PARTY_DRIFT_IGNORE_SECONDS = 0.75;
export const WATCH_PARTY_DRIFT_SEEK_SECONDS = 2.5;

export type WatchPartyPlayback = {
  playing: boolean;
  currentTime: number;
  playbackRate: number;
  updatedAtServerTime: number;
};

export type WatchPartyState = {
  roomId: string;
  revision: number;
  hostUserId: string;
  animeId: string;
  slug: string;
  season: number | null;
  episode: number | null;
  translationId: number | null;
  playback: WatchPartyPlayback;
};

export type WatchPartyEvent =
  | { type: "ROOM_STATE"; state: WatchPartyState }
  | { type: "ROOM_ENDED"; roomId: string; revision: number };

export type WatchPartyMember = {
  userId: string;
  displayName: string;
  image?: string | null;
  host: boolean;
};
