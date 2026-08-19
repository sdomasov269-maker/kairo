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

export function resolveNextAnimeSeason(
  date: Date = new Date(),
): AnimeSeasonSnapshot {
  const current = resolveCurrentAnimeSeason(date);
  if (current.season === "FALL") return { season: "WINTER", year: current.year + 1 };
  return {
    year: current.year,
    season:
      current.season === "WINTER"
        ? "SPRING"
        : current.season === "SPRING"
          ? "SUMMER"
          : "FALL",
  };
}

export function belongsToHomeSeasonWindow(
  anime: Anime,
  current: AnimeSeasonSnapshot,
  next: AnimeSeasonSnapshot,
): boolean {
  const isCurrent = anime.season === current.season && anime.year === current.year;
  const isNext = anime.season === next.season && anime.year === next.year;
  if (anime.status === "RELEASING" || anime.status === "NOT_YET_RELEASED")
    return isCurrent || isNext;
  if (anime.status !== "FINISHED" || !isCurrent) return false;
  if (!anime.endDate) return true;
  const ended = new Date(`${anime.endDate}T12:00:00Z`);
  if (Number.isNaN(ended.getTime())) return false;
  return (
    resolveCurrentAnimeSeason(ended).season === current.season &&
    resolveCurrentAnimeSeason(ended).year === current.year
  );
}

export function rankHomeSeasonWindow(anime: Anime[]): Anime[] {
  const priority = { RELEASING: 0, NOT_YET_RELEASED: 1, FINISHED: 2 } as const;
  return [...anime].sort(
    (a, b) =>
      (priority[a.status as keyof typeof priority] ?? 3) -
        (priority[b.status as keyof typeof priority] ?? 3) ||
      (b.popularity ?? -1) - (a.popularity ?? -1) ||
      a.id.localeCompare(b.id),
  );
}

export function selectHomeSeasonWindow(anime: Anime[], limit = 24): Anime[] {
  const ranked = rankHomeSeasonWindow(anime);
  const quotas = { RELEASING: 12, NOT_YET_RELEASED: 8, FINISHED: 4 } as const;
  const selected: Anime[] = [];
  for (const status of Object.keys(quotas) as Array<keyof typeof quotas>) {
    selected.push(...ranked.filter((item) => item.status === status).slice(0, quotas[status]));
  }
  if (selected.length < limit) {
    const known = new Set(selected.map((item) => item.id));
    selected.push(...ranked.filter((item) => !known.has(item.id)).slice(0, limit - selected.length));
  }
  return selected.slice(0, limit);
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
