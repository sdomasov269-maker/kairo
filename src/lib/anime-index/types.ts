export type AnimeIndexRecord = {
  anilistId: number;
  malId: number | null;
  slug: string;
  titles: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[];
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  coverImage: string | null;
  coverImageLarge: string | null;
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  studios: string[];
  averageScore: number | null;
  popularity: number | null;
};

export type AnimeIndexValidation =
  | { valid: true; record: AnimeIndexRecord }
  | { valid: false; errors: string[] };
