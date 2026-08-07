export interface AudioTrack {
  id: string;
  language: "RU" | "JP";
  studio: string;
}

export interface Anime {
  id: string;
  slug: string;
  anilistId?: number;
  malId?: number;
  title: string;
  titleRu?: string;
  titleUk?: string;
  titleEnglish?: string;
  titleRomaji?: string;
  titleNative?: string;
  displayTitle?: string;
  displayTitleLocale?: "ru" | "uk" | "en";
  synonyms?: string[];
  tagline: string;
  description: string;
  shortDescription?: string;
  descriptionRu?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  shortDescriptionRu?: string;
  shortDescriptionEn?: string;
  synopsis: string;
  coverImage?: string;
  coverImageLarge?: string;
  bannerImage?: string;
  dominantColor?: string;
  genres: string[];
  year?: number;
  season?: string;
  format?: string;
  status: string;
  episodes?: number;
  duration?: number;
  rating?: number;
  popularity?: number;
  studios?: string[];
  country?: string;
  source?: string;
  trailerUrl?: string;
  nextAiringEpisode?: { airingAt: number; episode: number };
  localization?: {
    ru?: {
      title?: string;
      description?: string;
      synonyms?: string[];
      source: "manual" | "shikimori" | "anilist-fallback" | "missing";
    };
    uk?: {
      title?: string;
      description?: string;
      synonyms?: string[];
      source: "manual" | "fallback" | "missing";
    };
  };
  isDemo?: boolean;
  art: string;
}

export interface Episode {
  id: string;
  animeTitle: string;
  episode: number;
  title: string;
  released: string;
  duration: string;
  audio: AudioTrack;
  art: string;
}

export interface Collection {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  art: string;
}

export interface WatchingProgress {
  id: string;
  title: string;
  episode: number;
  progress: number;
  remaining: string;
  art: string;
}
