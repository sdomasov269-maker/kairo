import { sanitizeShikimoriText } from "./sanitizers";
import type { RussianAnimeMetadata, ShikimoriAnimeResponse } from "./types";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function isShikimoriAnime(
  value: unknown,
): value is ShikimoriAnimeResponse {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.myanimelist_id === "number" &&
    typeof item.name === "string" &&
    (typeof item.russian === "string" || item.russian === null) &&
    (typeof item.description === "string" || item.description === null) &&
    typeof item.url === "string" &&
    isStringArray(item.english) &&
    isStringArray(item.japanese) &&
    isStringArray(item.synonyms)
  );
}

export function mapShikimoriAnime(
  value: ShikimoriAnimeResponse,
): RussianAnimeMetadata {
  const synonyms = [value.russian, ...value.synonyms]
    .map((item) => sanitizeShikimoriText(item))
    .filter(Boolean);
  return {
    titleRu: sanitizeShikimoriText(value.russian) || undefined,
    descriptionRu: sanitizeShikimoriText(value.description) || undefined,
    synonymsRu: [...new Set(synonyms)],
    shikimoriId: value.id,
    sourceUrl: /^\/animes\/[\w-]+$/.test(value.url)
      ? `https://shikimori.one${value.url}`
      : undefined,
  };
}
