import "server-only";
import { episodeCatalogs } from "@/data/releases";
import { validateEpisodeCatalog } from "./validation";
import type { EpisodeMetadata, EpisodeRelease } from "./types";
validateEpisodeCatalog(episodeCatalogs);
const slug = (value: string) => value.trim().toLowerCase();
const positive = (value: number) => Number.isInteger(value) && value > 0;
export function getAnimeEpisodes(
  animeSlug: string,
  seasonNumber?: number,
): EpisodeMetadata[] {
  return (
    episodeCatalogs.find((item) => item.animeSlug === slug(animeSlug))
      ?.episodes ?? []
  )
    .filter(
      (item) =>
        seasonNumber === undefined || item.seasonNumber === seasonNumber,
    )
    .sort(
      (a, b) =>
        a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
    );
}
export function getEpisode(
  animeSlug: string,
  seasonNumber: number,
  episodeNumber: number,
): EpisodeMetadata | null {
  if (!positive(seasonNumber) || !positive(episodeNumber)) return null;
  return (
    getAnimeEpisodes(animeSlug, seasonNumber).find(
      (item) => item.episodeNumber === episodeNumber,
    ) ?? null
  );
}
export function getPublishedEpisodeRelease(
  animeSlug: string,
  seasonNumber: number,
  episodeNumber: number,
): EpisodeRelease | null {
  const episode = getEpisode(animeSlug, seasonNumber, episodeNumber);
  if (!episode) return null;
  return (
    episodeCatalogs
      .find((item) => item.animeSlug === slug(animeSlug))
      ?.releases.find(
        (item) =>
          item.episodeId === episode.id &&
          item.isPublished &&
          item.sources.length > 0,
      ) ?? null
  );
}
export function getAvailableEpisodes(animeSlug: string) {
  return getAnimeEpisodes(animeSlug).filter((episode) =>
    getPublishedEpisodeRelease(
      animeSlug,
      episode.seasonNumber,
      episode.episodeNumber,
    ),
  );
}
export const getFirstAvailableEpisode = (animeSlug: string) =>
  getAvailableEpisodes(animeSlug)[0] ?? null;
export const hasWatchableEpisodes = (animeSlug: string) =>
  Boolean(getFirstAvailableEpisode(animeSlug));
export function getPreviousNextEpisode(
  animeSlug: string,
  season: number,
  episode: number,
) {
  const list = getAvailableEpisodes(animeSlug);
  const index = list.findIndex(
    (item) => item.seasonNumber === season && item.episodeNumber === episode,
  );
  return {
    previous: index > 0 ? list[index - 1] : null,
    next: index >= 0 ? (list[index + 1] ?? null) : null,
  };
}
export const getPreviousAvailableEpisode = (s: string, se: number, e: number) =>
  getPreviousNextEpisode(s, se, e).previous;
export const getNextAvailableEpisode = (s: string, se: number, e: number) =>
  getPreviousNextEpisode(s, se, e).next;
export function getEpisodeAvailabilityMap(animeSlug: string) {
  return Object.fromEntries(
    getAnimeEpisodes(animeSlug).map((e) => [
      e.id,
      Boolean(
        getPublishedEpisodeRelease(animeSlug, e.seasonNumber, e.episodeNumber),
      ),
    ]),
  );
}
export function getLatestPublishedEpisodes(limit: number) {
  return episodeCatalogs
    .flatMap((catalog) =>
      catalog.releases
        .filter((r) => r.isPublished)
        .map((release) => ({
          catalog,
          release,
          episode: catalog.episodes.find((e) => e.id === release.episodeId)!,
        })),
    )
    .filter((x) => x.episode)
    .sort((a, b) =>
      (b.release.releasedAt ?? "").localeCompare(a.release.releasedAt ?? ""),
    )
    .slice(0, Math.max(0, limit));
}
