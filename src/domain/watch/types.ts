export type EpisodeIdentity = {
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
};
export type LocalizedEpisodeText = {
  ru: { title?: string; synopsis?: string };
  en: { title?: string; synopsis?: string };
  uk?: { title?: string; synopsis?: string };
};
export type EpisodeMetadata = EpisodeIdentity & {
  id: string;
  anilistEpisodeNumber?: number;
  airDate?: string;
  availableAt?: string;
  duration?: number;
  thumbnail?: string;
  metadataProviders?: string[];
  text: LocalizedEpisodeText;
};
export type VideoSource = {
  id: string;
  kind: "dash" | "hls" | "mp4";
  url: string;
  label: string;
  isDemo: boolean;
  drm?: never;
};
export type SubtitleSource = {
  id: string;
  language: "ru" | "en" | "ja";
  label: string;
  url: string;
  isDefault?: boolean;
};
export type AudioLabel = {
  id: string;
  language: "ru" | "en" | "ja";
  label: string;
  studio?: string;
  kind?: "dub" | "voiceover" | "original";
};
export type EpisodeChapter = {
  id: string;
  type: "recap" | "intro" | "content" | "credits";
  titleRu: string;
  titleEn: string;
  startTime: number;
  endTime: number;
};
export type EpisodeRelease = {
  episodeId: string;
  sources: VideoSource[];
  subtitles: SubtitleSource[];
  audioLabels?: AudioLabel[];
  chapters: EpisodeChapter[];
  releasedAt?: string;
  isPublished: boolean;
};
export type AnimeEpisodeCatalog = {
  animeSlug: string;
  episodes: EpisodeMetadata[];
  releases: EpisodeRelease[];
};
