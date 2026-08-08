export const KODIK_ANIME_TYPES = ["anime", "anime-serial"] as const;
export type KodikAnimeType = (typeof KODIK_ANIME_TYPES)[number];
export type KodikTranslationType = "voice" | "subtitles";

export type KodikSearchParameters = {
  title?: string;
  title_orig?: string;
  strict?: boolean;
  full_match?: boolean;
  shikimori_id?: number;
  limit?: number;
  types?: readonly string[] | string;
  year?: number;
  translation_id?: number;
  translation_type?: KodikTranslationType;
  prioritize_translations?: readonly number[] | string;
  unprioritize_translations?: readonly number[] | string;
  prioritize_translation_type?: KodikTranslationType;
  block_translations?: readonly number[] | string;
  camrip?: boolean;
  with_seasons?: boolean;
  season?: number;
  with_episodes?: boolean;
  with_episodes_data?: boolean;
  episode?: number;
  not_blocked_in?: readonly string[] | string;
  with_material_data?: boolean;
};

export type KodikResolverInput = {
  anilistId?: number;
  malId?: number;
  shikimoriId?: number;
  year?: number;
  titles: {
    russian?: string;
    english?: string;
    romaji?: string;
    native?: string;
    aliases?: string[];
  };
};

export type KodikMatchConfidence =
  | "EXACT_EXTERNAL_ID"
  | "EXACT_TITLE_AND_YEAR"
  | "EXACT_TITLE"
  | "FUZZY_TITLE";

export type KodikBlockedSeasons =
  | "all"
  | Record<string, "all" | Array<string | number>>;

export type NormalizedKodikEpisode = {
  number: number;
  title?: string;
  playerLink: string;
  screenshots?: string[];
  blocked: boolean;
};

export type NormalizedKodikSeason = {
  number: number;
  playerLink?: string;
  episodes: NormalizedKodikEpisode[];
};

export type KodikTranslationSource = {
  id: number;
  title: string;
  type: KodikTranslationType;
  playerLink: string;
  quality?: string;
  blockedCountries: string[];
  blockedSeasons?: KodikBlockedSeasons;
  unavailable: boolean;
  seasons?: NormalizedKodikSeason[];
};

export type KodikAnimeSource = {
  provider: "kodik";
  kodikId: string;
  shikimoriId?: number;
  match: KodikMatchConfidence;
  title: string;
  originalTitle?: string;
  year?: number;
  type: KodikAnimeType;
  lastSeason?: number;
  lastEpisode?: number;
  episodesCount?: number;
  translations: KodikTranslationSource[];
};
