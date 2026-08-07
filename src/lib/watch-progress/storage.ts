"use client";
import { migrateWatchProgressV1ToV2 } from "./migrations";
import { calculateWatchPercent } from "./selectors";
import type { WatchProgressEntry, WatchProgressStore } from "./types";
const KEY = "kairo:watch-progress:v2",
  OLD = "kairo:watch-progress:v1";
let snapshot: WatchProgressStore = { version: 2, entries: [] };
let initialized = false;
const listeners = new Set<() => void>();
function safe(value: string | null): unknown {
  try {
    return JSON.parse(value ?? "null");
  } catch {
    return null;
  }
}
function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const parsed = safe(localStorage.getItem(KEY));
  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as { version?: number }).version === 2
  )
    snapshot = parsed as WatchProgressStore;
  else {
    snapshot = migrateWatchProgressV1ToV2(safe(localStorage.getItem(OLD)));
    localStorage.setItem(KEY, JSON.stringify(snapshot));
    localStorage.removeItem(OLD);
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      const next = safe(e.newValue);
      if (next && typeof next === "object")
        snapshot = next as WatchProgressStore;
      listeners.forEach((l) => l());
    }
  });
}
export function getProgressSnapshot() {
  init();
  return snapshot;
}
export function subscribeProgress(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function saveWatchProgress(input: Omit<WatchProgressEntry, "percent">) {
  init();
  const entry = {
    ...input,
    currentTime: Math.max(0, input.currentTime),
    duration: Math.max(0, input.duration),
    percent: calculateWatchPercent(input.currentTime, input.duration),
  };
  const key = (e: WatchProgressEntry) =>
    `${e.animeSlug}:${e.seasonNumber}:${e.episodeNumber}`;
  snapshot = {
    version: 2,
    entries: [entry, ...snapshot.entries.filter((e) => key(e) !== key(entry))]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 300),
  };
  localStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}
export function clearWatchProgress() {
  snapshot = { version: 2, entries: [] };
  localStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}
export function removeWatchProgress(
  slug: string,
  season: number,
  episode: number,
) {
  snapshot = {
    version: 2,
    entries: snapshot.entries.filter(
      (e) =>
        !(
          e.animeSlug === slug &&
          e.seasonNumber === season &&
          e.episodeNumber === episode
        ),
    ),
  };
  localStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}
