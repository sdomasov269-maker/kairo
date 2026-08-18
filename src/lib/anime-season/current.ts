import type { CatalogSeason } from "@/lib/catalog";
import type { Anime } from "@/types/media";

export interface AnimeSeasonSnapshot {
  season: CatalogSeason;
  year: number;
}

export function resolveCurrentAnimeSeason(
  date: Date = new Date(),
): AnimeSeasonSnapshot {
  const month = date.getUTCMonth();
  const season: CatalogSeason =
    month < 3 ? "WINTER" : month < 6 ? "SPRING" : month < 9 ? "SUMMER" : "FALL";
  return { season, year: date.getUTCFullYear() };
}

export function rankCurrentSeasonAnime(anime: Anime[]): Anime[] {
  return [...anime].sort(
    (a, b) =>
      (b.popularity ?? -1) - (a.popularity ?? -1) ||
      (b.rating ?? -1) - (a.rating ?? -1) ||
      a.id.localeCompare(b.id),
  );
}

export const hasMoreSeasonAnime = (
  total: number,
  offset: number,
  received: number,
) => offset + received < total;

export function mergeSeasonAnimePages(
  existing: Anime[],
  next: Anime[],
): Anime[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}
