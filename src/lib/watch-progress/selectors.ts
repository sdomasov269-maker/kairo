import type { WatchProgressEntry } from "./types";
import type { EpisodeMetadata } from "@/domain/watch/types";
import { WATCH_COMPLETION_PERCENT } from "./policy";

export const calculateWatchPercent = (time: number, duration: number) =>
  duration > 0 ? Math.min(100, Math.max(0, (time / duration) * 100)) : 0;
export const isEpisodeCompleted = (
  entry: Pick<WatchProgressEntry, "percent" | "completed">,
) => entry.completed || entry.percent >= WATCH_COMPLETION_PERCENT;
export const selectContinueWatching = (
  entries: WatchProgressEntry[],
  limit = 6,
) => {
  const latestByAnime = new Map<string, WatchProgressEntry>();
  entries
    .filter(
      (entry) =>
        !isEpisodeCompleted(entry) &&
        entry.percent >= 1 &&
        Number.isFinite(entry.currentTime) &&
        entry.currentTime >= 5 &&
        Number.isFinite(entry.duration) &&
        entry.duration > 0 &&
        Number.isFinite(Date.parse(entry.updatedAt)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .forEach((entry) => {
      if (!latestByAnime.has(entry.animeSlug))
        latestByAnime.set(entry.animeSlug, entry);
    });
  return [...latestByAnime.values()].slice(0, limit);
};

export const selectAnimeProgress = (
  entries: WatchProgressEntry[],
  animeSlug: string,
  availableEpisodes: EpisodeMetadata[],
) => {
  const available = [...availableEpisodes].sort(
    (a, b) =>
      a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
  );
  const availableKeys = new Set(
    available.map(
      (episode) => `${episode.seasonNumber}:${episode.episodeNumber}`,
    ),
  );
  const animeEntries = entries
    .filter(
      (entry) =>
        entry.animeSlug === animeSlug &&
        availableKeys.has(`${entry.seasonNumber}:${entry.episodeNumber}`),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = animeEntries[0] ?? null;
  const incomplete =
    animeEntries.find(
      (entry) =>
        !isEpisodeCompleted(entry) &&
        Number.isFinite(entry.currentTime) &&
        entry.currentTime >= 5,
    ) ?? null;
  const completedKeys = new Set(
    animeEntries
      .filter(isEpisodeCompleted)
      .map((entry) => `${entry.seasonNumber}:${entry.episodeNumber}`),
  );
  const allCompleted =
    available.length > 0 &&
    available.every((episode) =>
      completedKeys.has(`${episode.seasonNumber}:${episode.episodeNumber}`),
    );
  const firstUncompleted = available.find(
    (episode) =>
      !completedKeys.has(`${episode.seasonNumber}:${episode.episodeNumber}`),
  );
  const targetEpisode =
    (incomplete &&
      available.find(
        (episode) =>
          episode.seasonNumber === incomplete.seasonNumber &&
          episode.episodeNumber === incomplete.episodeNumber,
      )) ||
    (allCompleted
      ? available[available.length - 1]
      : (firstUncompleted ?? available[0])) ||
    null;

  return { animeEntries, latest, incomplete, allCompleted, targetEpisode };
};
