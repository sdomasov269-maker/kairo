import type {
  AnimeMediaProvider,
  ProviderAnimeCandidate,
  ProviderAnimeDetails,
  ProviderAnimeSearchInput,
  ProviderEpisode,
  ProviderPlayback,
  ProviderPlaybackRequest,
} from "./types.ts";
import { noCapabilities } from "./types.ts";

export type AuthorizedProviderManifest = {
  provider: { key: string; name: string };
  anime: Array<
    ProviderAnimeDetails & {
      episodes: Array<ProviderEpisode & { playback?: ProviderPlayback }>;
    }
  >;
};
export class ManifestMediaProvider implements AnimeMediaProvider {
  readonly key: string;
  readonly name: string;
  readonly capabilities = {
    ...noCapabilities(),
    SEARCH: true,
    ANIME_DETAILS: true,
    EPISODES: true,
    DIRECT_MEDIA: true,
    SUBTITLES: true,
  };
  constructor(private readonly manifest: AuthorizedProviderManifest) {
    this.key = manifest.provider.key;
    this.name = manifest.provider.name;
    if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(this.key))
      throw new Error("Invalid provider key");
  }
  async healthCheck() {
    return { status: "HEALTHY" as const, checkedAt: new Date().toISOString() };
  }
  async searchAnime(
    input: ProviderAnimeSearchInput,
  ): Promise<ProviderAnimeCandidate[]> {
    const title = input.title.toLocaleLowerCase();
    return this.manifest.anime
      .filter(
        (anime) =>
          anime.anilistId === input.anilistId ||
          anime.malId === input.malId ||
          anime.title.toLocaleLowerCase().includes(title),
      )
      .map((anime) => ({
        providerAnimeId: anime.providerAnimeId,
        title: anime.title,
        alternativeTitles: anime.alternativeTitles,
        anilistId: anime.anilistId,
        malId: anime.malId,
        year: anime.year,
        format: anime.format,
        confidence: anime.confidence,
      }));
  }
  async getAnime(id: string) {
    const anime = this.manifest.anime.find(
      (item) => item.providerAnimeId === id,
    );
    if (!anime) return null;
    return {
      providerAnimeId: anime.providerAnimeId,
      title: anime.title,
      alternativeTitles: anime.alternativeTitles,
      anilistId: anime.anilistId,
      malId: anime.malId,
      year: anime.year,
      format: anime.format,
      confidence: anime.confidence,
      description: anime.description,
      episodeCount: anime.episodeCount,
      status: anime.status,
    };
  }
  async getEpisodes(id: string) {
    return (
      this.manifest.anime
        .find((item) => item.providerAnimeId === id)
        ?.episodes.map((episode) => ({
          providerEpisodeId: episode.providerEpisodeId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          absoluteNumber: episode.absoluteNumber,
          title: episode.title,
          titleRu: episode.titleRu,
          titleUk: episode.titleUk,
          airDate: episode.airDate,
          durationSeconds: episode.durationSeconds,
          isPublished: episode.isPublished,
          audioVariants: episode.audioVariants,
          subtitleVariants: episode.subtitleVariants,
        })) ?? []
    );
  }
  async getPlayback(input: ProviderPlaybackRequest) {
    return (
      this.manifest.anime
        .find((anime) => anime.providerAnimeId === input.providerAnimeId)
        ?.episodes.find(
          (episode) => episode.providerEpisodeId === input.providerEpisodeId,
        )?.playback ?? null
    );
  }
}
