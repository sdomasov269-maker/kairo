import { anilistSlug } from "../catalog/utils.ts";
import type { Anime } from "../../types/media.ts";
import type { AnimeIndexRecord, AnimeIndexValidation } from "./types.ts";

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const integer = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) ? value : null;
export const normalizeAnimeStringArray = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  return values.map(text).filter((value): value is string => {
    if (!value) return false;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function normalizeAnimeSlug(
  anilistId: number,
  slug: unknown,
  title: string,
): string {
  const existing = text(slug);
  if (existing && new RegExp(`^anilist-${anilistId}(?:-|$)`).test(existing))
    return existing;
  return anilistSlug(anilistId, title);
}

export function mapCatalogAnimeToIndexRecord(anime: Anime): AnimeIndexRecord {
  const anilistId = integer(anime.anilistId) ?? 0;
  const english = text(anime.titleEnglish) ?? text(anime.title);
  const romaji = text(anime.titleRomaji);
  const native = text(anime.titleNative);
  const fallbackTitle = english ?? romaji ?? native ?? `Anime ${anilistId}`;
  return {
    anilistId,
    malId: integer(anime.malId),
    slug: normalizeAnimeSlug(anilistId, anime.slug, fallbackTitle),
    titles: { romaji, english, native },
    synonyms: normalizeAnimeStringArray(anime.synonyms),
    format: text(anime.format),
    status: text(anime.status),
    season: text(anime.season),
    seasonYear: integer(anime.year),
    episodes: integer(anime.episodes),
    duration: integer(anime.duration),
    coverImage: text(anime.coverImage),
    coverImageLarge: text(anime.coverImageLarge),
    bannerImage: text(anime.bannerImage),
    description: text(anime.descriptionEn) ?? text(anime.description),
    genres: normalizeAnimeStringArray(anime.genres),
    studios: normalizeAnimeStringArray(anime.studios),
    averageScore: integer(anime.rating),
    popularity: integer(anime.popularity),
  };
}

export function validateAnimeIndexRecord(
  record: AnimeIndexRecord,
): AnimeIndexValidation {
  const errors: string[] = [];
  if (
    !Number.isSafeInteger(record.anilistId) ||
    record.anilistId <= 0 ||
    record.anilistId > 999_999_999
  )
    errors.push("invalid-anilist-id");
  if (!record.slug.trim()) errors.push("missing-slug");
  if (!record.titles.english && !record.titles.romaji && !record.titles.native)
    errors.push("missing-title");
  return errors.length ? { valid: false, errors } : { valid: true, record };
}

export function mergeAnimeIndexRecord<T extends Record<string, unknown>>(
  existing: T,
  record: AnimeIndexRecord,
) {
  const keep = <V>(incoming: V | null, current: unknown): V | unknown =>
    incoming ?? current;
  return {
    malId: keep(record.malId, existing.malId),
    slug: existing.slug || record.slug,
    titleRomaji: keep(record.titles.romaji, existing.titleRomaji),
    titleEnglish: keep(record.titles.english, existing.titleEnglish),
    titleNative: keep(record.titles.native, existing.titleNative),
    synonyms: record.synonyms.length ? record.synonyms : existing.synonyms,
    format: keep(record.format, existing.format),
    status: keep(record.status, existing.status),
    season: keep(record.season, existing.season),
    year: keep(record.seasonYear, existing.year),
    episodes: keep(record.episodes, existing.episodes),
    duration: keep(record.duration, existing.duration),
    coverImage: keep(record.coverImage, existing.coverImage),
    coverImageLarge: keep(record.coverImageLarge, existing.coverImageLarge),
    bannerImage: keep(record.bannerImage, existing.bannerImage),
    descriptionEnglish: keep(record.description, existing.descriptionEnglish),
    genres: record.genres.length ? record.genres : existing.genres,
    studios: record.studios.length ? record.studios : existing.studios,
    rating: keep(record.averageScore, existing.rating),
    popularity: keep(record.popularity, existing.popularity),
    sourceUpdatedAt: new Date(),
  };
}
