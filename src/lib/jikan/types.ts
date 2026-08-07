export interface JikanNamedResource {
  mal_id: number;
  name: string;
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[];
  synopsis: string | null;
  background: string | null;
  images: {
    jpg: { image_url: string | null; large_image_url: string | null };
    webp: { image_url: string | null; large_image_url: string | null };
  };
  trailer: { youtube_id: string | null; url: string | null } | null;
  type: string | null;
  source: string | null;
  episodes: number | null;
  status: string | null;
  airing: boolean;
  duration: string | null;
  score: number | null;
  popularity: number | null;
  year: number | null;
  season: string | null;
  aired: { from: string | null };
  genres: JikanNamedResource[];
  studios: JikanNamedResource[];
}

export type JikanResult<T> =
  { ok: true; data: T } | { ok: false; status: number | null };
