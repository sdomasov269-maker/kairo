export const CATALOG_SORTS = [
  "POPULARITY_DESC",
  "TRENDING_DESC",
  "SCORE_DESC",
  "START_DATE_DESC",
  "START_DATE",
  "TITLE_ROMAJI",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type CatalogSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type CatalogFormat =
  "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL" | "TV_SHORT";
export type CatalogStatus =
  "RELEASING" | "FINISHED" | "NOT_YET_RELEASED" | "HIATUS" | "CANCELLED";
export interface CatalogFilters {
  search?: string;
  page: number;
  perPage: number;
  genres: string[];
  year?: number;
  season?: CatalogSeason;
  format?: CatalogFormat;
  status?: CatalogStatus;
  sort: CatalogSort;
  minimumScore?: number;
}
export interface CatalogPageInfo {
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  total: number;
}
