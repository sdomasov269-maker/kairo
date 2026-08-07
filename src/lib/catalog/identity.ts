import type { Anime } from "@/types/media";

export const normalizeAnimeTitle = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const titles = (anime: Anime) =>
  new Set(
    [
      anime.title,
      anime.titleRu,
      anime.titleEnglish,
      anime.titleRomaji,
      anime.titleNative,
    ]
      .filter((title): title is string => Boolean(title))
      .map(normalizeAnimeTitle),
  );

export const isSameAnime = (left: Anime, right: Anime) => {
  if (left.anilistId && left.anilistId === right.anilistId) return true;
  if (left.malId && left.malId === right.malId) return true;
  if (left.slug === right.slug) return true;
  const leftTitles = titles(left);
  return [...titles(right)].some((title) => leftTitles.has(title));
};

export function deduplicateCatalog(
  primary: Anime[],
  fallback: Anime[],
): Anime[] {
  const result = [...fallback];
  for (const anime of primary) {
    const duplicate = result.findIndex((item) => isSameAnime(anime, item));
    if (duplicate >= 0) result.splice(duplicate, 1, anime);
    else result.push(anime);
  }
  return result;
}
