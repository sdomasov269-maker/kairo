import type { WatchProgressEntry } from "@/lib/watch-progress";

export type DataMode = { kind: "guest" } | { kind: "account"; userId: string };
export type AnimeListStatus =
  "PLANNED" | "WATCHING" | "COMPLETED" | "PAUSED" | "DROPPED";
export type AnimeListEntry = {
  animeKey: string;
  status: AnimeListStatus;
  addedAt: string;
  updatedAt: string;
};
export type PlayerPreferences = {
  locale: "ru" | "uk" | "en";
  autoplayNext: boolean;
  playbackRate: number;
  subtitleLanguage: string | null;
  subtitlesEnabled: boolean;
  subtitleSize: "small" | "medium" | "large";
  subtitleBackground: "none" | "shadow" | "solid";
  preferredAudioLanguage: string | null;
  preferredQualityMode: "auto" | number;
  reducedEffectsPreference: "full" | "balanced" | "minimal";
};
export type AccountCache = {
  version: 1;
  userId: string;
  progress: WatchProgressEntry[];
  animeList: AnimeListEntry[];
  preferences: PlayerPreferences | null;
  lastSyncedAt: string | null;
};
export type AccountDataStatus =
  | "idle"
  | "loading"
  | "ready"
  | "offline-cache"
  | "syncing"
  | "error"
  | "session-expired";
