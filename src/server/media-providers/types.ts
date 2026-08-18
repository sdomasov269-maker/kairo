export type ProviderCapability =
  | "SEARCH"
  | "ANIME_DETAILS"
  | "EPISODES"
  | "DIRECT_MEDIA"
  | "OFFICIAL_EMBED"
  | "SUBTITLES"
  | "AUDIO_VARIANTS"
  | "UPDATES";
export type ProviderCapabilities = Readonly<
  Record<ProviderCapability, boolean>
>;
export type ProviderHealth = {
  status: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNSUPPORTED";
  checkedAt: string;
  latencyMs?: number;
  message?: string;
};
export type ProviderAnimeSearchInput = {
  anilistId?: number;
  malId?: number;
  title: string;
  year?: number;
  format?: string;
};
export type ProviderAnimeCandidate = {
  providerAnimeId: string;
  title: string;
  alternativeTitles?: string[];
  anilistId?: number;
  malId?: number;
  year?: number;
  format?: string;
  confidence?: number;
};
export type ProviderAnimeDetails = ProviderAnimeCandidate & {
  description?: string;
  episodeCount?: number;
  status?: string;
};
export type ProviderEpisode = {
  providerEpisodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  absoluteNumber?: number;
  title?: string;
  titleRu?: string;
  titleUk?: string;
  airDate?: string;
  durationSeconds?: number;
  isPublished: boolean;
  audioVariants?: Array<{ id: string; language: string; label: string }>;
  subtitleVariants?: Array<{ id: string; language: string; label: string }>;
};
export type ProviderPlaybackRequest = {
  providerAnimeId: string;
  providerEpisodeId: string;
  audioVariantId?: string;
  subtitleVariantId?: string;
};
export type ProviderPlayback = {
  kind: "DIRECT" | "EMBED";
  referenceId: string;
  protocol?: "DASH" | "HLS" | "MP4";
  url: string;
  expiresAt?: string;
  subtitles?: Array<{
    language: string;
    label: string;
    url: string;
    format: "vtt";
  }>;
};
export type ProviderUpdateBatch = {
  cursor?: string;
  updates: Array<{
    providerAnimeId: string;
    providerEpisodeId?: string;
    type: "ANIME" | "EPISODE" | "PLAYBACK";
    occurredAt: string;
  }>;
};

export interface AnimeMediaProvider {
  readonly key: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  healthCheck(): Promise<ProviderHealth>;
  searchAnime(
    input: ProviderAnimeSearchInput,
  ): Promise<ProviderAnimeCandidate[]>;
  getAnime(providerAnimeId: string): Promise<ProviderAnimeDetails | null>;
  getEpisodes(providerAnimeId: string): Promise<ProviderEpisode[]>;
  getPlayback(input: ProviderPlaybackRequest): Promise<ProviderPlayback | null>;
  getUpdates?(cursor?: string): Promise<ProviderUpdateBatch>;
}

export const noCapabilities = (): ProviderCapabilities => ({
  SEARCH: false,
  ANIME_DETAILS: false,
  EPISODES: false,
  DIRECT_MEDIA: false,
  OFFICIAL_EMBED: false,
  SUBTITLES: false,
  AUDIO_VARIANTS: false,
  UPDATES: false,
});
