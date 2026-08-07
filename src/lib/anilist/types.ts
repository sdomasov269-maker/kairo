export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}
export interface AniListCover {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}
export interface AniListStudioNode {
  name: string;
  isAnimationStudio: boolean;
}
export interface AniListRelationEdge {
  relationType: string;
  node: AniListMedia;
}
export interface AniListMedia {
  id: number;
  type?: "ANIME" | "MANGA";
  idMal: number | null;
  title: AniListTitle;
  description: string | null;
  coverImage: AniListCover;
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  trending: number | null;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  status: string | null;
  countryOfOrigin: string | null;
  source: string | null;
  studios: { nodes: AniListStudioNode[] };
  synonyms: string[];
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  relations: { edges: AniListRelationEdge[] };
  trailer: { id: string; site: string; thumbnail: string | null } | null;
}
export interface AniListGraphQLError {
  message: string;
}
export interface AniListResponse<T> {
  data?: T;
  errors?: AniListGraphQLError[];
}
