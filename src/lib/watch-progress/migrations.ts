import { calculateWatchPercent } from "./selectors";
import type { WatchProgressEntry, WatchProgressStore } from "./types";
export function migrateWatchProgressV1ToV2(value: unknown): WatchProgressStore {
  if (!Array.isArray(value)) return { version: 2, entries: [] };
  const entries = value.flatMap((raw): WatchProgressEntry[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const currentTime = Number(item.currentTime),
      duration = Number(item.duration),
      episodeNumber = Number(item.episode);
    if (
      typeof item.animeSlug !== "string" ||
      !Number.isFinite(currentTime) ||
      !Number.isFinite(duration) ||
      !Number.isInteger(episodeNumber)
    )
      return [];
    const percent = calculateWatchPercent(currentTime, duration);
    return [
      {
        animeSlug: item.animeSlug,
        seasonNumber: 1,
        episodeNumber,
        currentTime: Math.max(0, currentTime),
        duration: Math.max(0, duration),
        percent,
        completed: Boolean(item.completed) || percent >= 95,
        updatedAt:
          typeof item.updatedAt === "string"
            ? item.updatedAt
            : new Date(0).toISOString(),
      },
    ];
  });
  return { version: 2, entries };
}
