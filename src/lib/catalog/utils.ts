import {
  CATALOG_SORTS,
  type CatalogFilters,
  type CatalogFormat,
  type CatalogSeason,
  type CatalogSort,
  type CatalogStatus,
} from "./types.ts";
type ParamValue = string | string[] | undefined;
type ParamsInput = Record<string, ParamValue>;
const seasons = new Set<CatalogSeason>(["WINTER", "SPRING", "SUMMER", "FALL"]);
const formats = new Set<CatalogFormat>([
  "TV",
  "MOVIE",
  "OVA",
  "ONA",
  "SPECIAL",
  "TV_SHORT",
]);
const statuses = new Set<CatalogStatus>([
  "RELEASING",
  "FINISHED",
  "NOT_YET_RELEASED",
  "HIATUS",
  "CANCELLED",
]);
const sorts = new Set<CatalogSort>(CATALOG_SORTS);
const first = (value: ParamValue) => (Array.isArray(value) ? value[0] : value);
const integer = (value: string | undefined, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
};
export function parseCatalogParams(params: ParamsInput): CatalogFilters {
  const search = first(params.search)
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const genres = (first(params.genres) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
  const season = first(params.season) as CatalogSeason | undefined;
  const format = first(params.format) as CatalogFormat | undefined;
  const status = first(params.status) as CatalogStatus | undefined;
  const sort = first(params.sort) as CatalogSort | undefined;
  return {
    search: search || undefined,
    page: integer(first(params.page), 1, 500) ?? 1,
    perPage: 24,
    genres,
    year: integer(first(params.year), 1940, new Date().getFullYear() + 2),
    season: season && seasons.has(season) ? season : undefined,
    format: format && formats.has(format) ? format : undefined,
    status: status && statuses.has(status) ? status : undefined,
    sort: sort && sorts.has(sort) ? sort : "POPULARITY_DESC",
    minimumScore: integer(first(params.score), 0, 90),
  };
}
export function catalogVariables(
  filters: CatalogFilters,
): Record<string, unknown> {
  return {
    page: filters.page,
    perPage: filters.perPage,
    search: filters.search,
    genres: filters.genres.length ? filters.genres : undefined,
    year: filters.year,
    season: filters.season,
    format: filters.format,
    status: filters.status,
    sort: [filters.sort],
    minimumScore: filters.minimumScore
      ? Math.max(0, filters.minimumScore - 1)
      : undefined,
  };
}
export function updateCatalogParam(
  current: URLSearchParams,
  key: string,
  value?: string,
): string {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.set("page", "1");
  return next.toString();
}
export function anilistSlug(id: number, title: string): string {
  const safe = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `anilist-${id}-${safe || "anime"}`;
}
export function extractAniListId(slug: string): number | null {
  if (slug.length > 120) return null;
  const match = /^anilist-(\d{1,9})(?:-[a-z0-9-]+)?$/.exec(slug);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 && id <= 999_999_999 ? id : null;
}
export function malSlug(id: number, title: string): string {
  return anilistSlug(id, title).replace(/^anilist-/, "mal-");
}
export function extractMalId(slug: string): number | null {
  if (!slug.startsWith("mal-")) return null;
  return extractAniListId(slug.replace(/^mal-/, "anilist-"));
}
export function pluralizeTitles(
  count: number,
  locale: "ru" | "uk" | "en",
): string {
  if (locale === "en") return count === 1 ? "title" : "titles";
  if (locale === "uk") {
    const mod10 = count % 10,
      mod100 = count % 100;
    return mod10 === 1 && mod100 !== 11
      ? "тайтл"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "тайтли"
        : "тайтлів";
  }
  const mod10 = count % 10,
    mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "тайтл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "тайтла";
  return "тайтлов";
}
