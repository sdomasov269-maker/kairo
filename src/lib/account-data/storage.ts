"use client";
import type { AccountCache, AnimeListEntry, PlayerPreferences } from "./types";
import type { WatchProgressEntry } from "@/lib/watch-progress";

const PREFIX = "kairo:account-cache:v1:";
export const GUEST_LIST_KEY = "kairo:anime-list:v1";
export const GUEST_PREFERENCES_KEY = "kairo:player-preferences:v1";
export const emptyPreferences: PlayerPreferences = {
  locale: "ru",
  autoplayNext: false,
  playbackRate: 1,
  subtitleLanguage: null,
  subtitlesEnabled: false,
  subtitleSize: "medium",
  subtitleBackground: "shadow",
  preferredAudioLanguage: null,
  preferredQualityMode: "auto",
  reducedEffectsPreference: "balanced",
};
const validDate = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const validProgress = (v: unknown): v is WatchProgressEntry => {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.animeSlug === "string" &&
    x.animeSlug.length <= 160 &&
    Number.isInteger(x.seasonNumber) &&
    Number(x.seasonNumber) > 0 &&
    Number.isInteger(x.episodeNumber) &&
    Number(x.episodeNumber) > 0 &&
    Number.isFinite(x.currentTime) &&
    Number.isFinite(x.duration) &&
    validDate(x.updatedAt)
  );
};
const statuses = new Set([
  "PLANNED",
  "WATCHING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
]);
const validList = (v: unknown): v is AnimeListEntry => {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.animeKey === "string" &&
    x.animeKey.length <= 160 &&
    statuses.has(String(x.status)) &&
    validDate(x.addedAt) &&
    validDate(x.updatedAt)
  );
};
export function readAccountCache(userId: string): AccountCache | null {
  try {
    const x = JSON.parse(localStorage.getItem(PREFIX + userId) ?? "null");
    if (!x || x.version !== 1 || x.userId !== userId) return null;
    return {
      version: 1,
      userId,
      progress: Array.isArray(x.progress)
        ? x.progress.filter(validProgress).slice(0, 300)
        : [],
      animeList: Array.isArray(x.animeList)
        ? x.animeList.filter(validList).slice(0, 500)
        : [],
      preferences:
        x.preferences && typeof x.preferences === "object"
          ? (x.preferences as PlayerPreferences)
          : null,
      lastSyncedAt: validDate(x.lastSyncedAt) ? x.lastSyncedAt : null,
    };
  } catch {
    return null;
  }
}
export function writeAccountCache(cache: AccountCache) {
  localStorage.setItem(
    PREFIX + cache.userId,
    JSON.stringify({
      ...cache,
      progress: cache.progress.slice(0, 300),
      animeList: cache.animeList.slice(0, 500),
    }),
  );
}
export function clearAccountCache(userId: string) {
  localStorage.removeItem(PREFIX + userId);
}
export function readGuestList(): AnimeListEntry[] {
  try {
    const x = JSON.parse(localStorage.getItem(GUEST_LIST_KEY) ?? "[]");
    return Array.isArray(x) ? x.filter(validList).slice(0, 500) : [];
  } catch {
    return [];
  }
}
export function writeGuestList(items: AnimeListEntry[]) {
  localStorage.setItem(GUEST_LIST_KEY, JSON.stringify(items.slice(0, 500)));
}
export function readGuestPreferences(): PlayerPreferences {
  try {
    const x = JSON.parse(localStorage.getItem(GUEST_PREFERENCES_KEY) ?? "null");
    if (x && typeof x === "object")
      return { ...emptyPreferences, ...x } as PlayerPreferences;
  } catch {}
  const migrated = {
    ...emptyPreferences,
    playbackRate: Number(localStorage.getItem("kairo:playback-rate:v1")) || 1,
    autoplayNext: localStorage.getItem("kairo:autoplay-next:v1") === "true",
    subtitleLanguage: localStorage.getItem("kairo:subtitle-language:v1"),
  };
  localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(migrated));
  return migrated;
}
export function writeGuestPreferences(value: PlayerPreferences) {
  localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(value));
}
