import type { AnimeEpisodeCatalog } from "./types";
const TRUSTED_HOSTS = new Set(["storage.googleapis.com"]);
export function validateEpisodeCatalog(catalogs: AnimeEpisodeCatalog[]): void {
  const episodeIds = new Set<string>();
  for (const catalog of catalogs) {
    for (const episode of catalog.episodes) {
      if (
        episodeIds.has(episode.id) ||
        episode.episodeNumber < 1 ||
        episode.seasonNumber < 1
      )
        throw new Error(`Invalid episode: ${episode.id}`);
      episodeIds.add(episode.id);
    }
    for (const release of catalog.releases) {
      const sourceIds = new Set<string>();
      if (!episodeIds.has(release.episodeId))
        throw new Error(`Unknown release episode: ${release.episodeId}`);
      if (release.isPublished && release.sources.length === 0)
        throw new Error(
          `Published release has no source: ${release.episodeId}`,
        );
      for (const source of release.sources) {
        if (sourceIds.has(source.id))
          throw new Error(`Duplicate source: ${source.id}`);
        sourceIds.add(source.id);
        const url = new URL(source.url);
        if (url.protocol !== "https:" || !TRUSTED_HOSTS.has(url.hostname))
          throw new Error(`Untrusted source: ${source.id}`);
      }
      for (const chapter of release.chapters)
        if (chapter.startTime >= chapter.endTime)
          throw new Error(`Invalid chapter: ${chapter.id}`);
    }
  }
}
