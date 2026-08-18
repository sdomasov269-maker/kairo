import type { WatchProgressEntry } from "@/lib/watch-progress";

export const KODIK_PROGRESS_SAVE_INTERVAL_MS = 20_000;

export function shouldPersistKodikProgress(
  lastSavedAt: number,
  now: number,
  interval = KODIK_PROGRESS_SAVE_INTERVAL_MS,
) {
  return now - lastSavedAt >= interval;
}

export function getKodikResumePosition(
  entry: WatchProgressEntry | undefined,
): number | null {
  if (!entry || entry.completed || entry.currentTime <= 5) return null;
  if (entry.duration > 0 && entry.currentTime >= entry.duration - 15)
    return null;
  return entry.currentTime;
}
