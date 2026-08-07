export interface VideoSource {
  id: string;
  type: "hls" | "dash" | "mp4";
  url: string;
  label: string;
  isDemo: boolean;
}
export interface SubtitleTrack {
  id: string;
  language: "ru" | "en" | "ja";
  label: string;
  url: string;
  kind: "subtitles";
  isDefault?: boolean;
}
export interface AudioTrackMetadata {
  id: string;
  language: string;
  label: string;
  studio?: string;
}
export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  type?: "intro" | "recap" | "content" | "credits";
}
export interface ThumbnailTrack {
  vttUrl?: string;
  spriteUrl?: string;
}
export interface WatchEpisode {
  animeSlug: string;
  episodeNumber: number;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  duration?: number;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  audioTracks: AudioTrackMetadata[];
  chapters: Chapter[];
  thumbnails?: ThumbnailTrack;
}
