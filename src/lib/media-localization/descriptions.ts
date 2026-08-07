import { animeLocalizationOverridesRu } from "@/data/localizations/anime-overrides.ru";
import type { Anime } from "@/types/media";
import type { MediaLocale } from "./types";

export interface LocalizedAnimeDescription {
  short: string | null;
  full: string | null;
  source: "manual" | "shikimori" | "anilist" | "fallback" | "missing";
  hasFullDescription: boolean;
}

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export function createShortDescription(
  text: string | null | undefined,
  maxLength = 280,
): string | null {
  if (!text) return null;
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  const minimumSentenceLength = Math.min(120, Math.floor(maxLength * 0.45));
  const candidate = normalized.slice(0, maxLength + 1);
  const sentenceEnds = [...candidate.matchAll(/[.!?](?=\s|$)/g)]
    .map((match) => (match.index ?? 0) + 1)
    .filter((index) => index >= minimumSentenceLength && index <= maxLength);
  const sentenceEnd = sentenceEnds.at(-1);
  if (sentenceEnd) return `${candidate.slice(0, sentenceEnd).trim()}…`;
  const wordEnd = candidate.slice(0, maxLength).lastIndexOf(" ");
  const end = wordEnd > minimumSentenceLength ? wordEnd : maxLength;
  return `${candidate
    .slice(0, end)
    .trim()
    .replace(/[.,;:!?]+$/, "")}…`;
}

const normalizeForComparison = (value: string): string =>
  value
    .toLocaleLowerCase()
    .replace(/[«»„“”"'`]/g, "")
    .replace(/[….,!?;:—–-]+$/g, "")
    .replace(/[.,!?;:—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function areDescriptionsEffectivelyEqual(
  short: string | null | undefined,
  full: string | null | undefined,
): boolean {
  if (!short || !full) return false;
  const normalizedShort = normalizeForComparison(short);
  const normalizedFull = normalizeForComparison(full);
  if (normalizedShort === normalizedFull) return true;
  const difference = Math.abs(normalizedFull.length - normalizedShort.length);
  return (
    difference < 36 &&
    (normalizedFull.startsWith(normalizedShort) ||
      normalizedShort.startsWith(normalizedFull))
  );
}

export function resolveLocalizedAnimeDescription(
  anime: Anime,
  locale: MediaLocale,
): LocalizedAnimeDescription {
  const manual = anime.anilistId
    ? animeLocalizationOverridesRu[anime.anilistId]
    : undefined;
  const isRussian = locale === "ru";
  const isUkrainian = locale === "uk";
  const localizedDescription = isRussian
    ? anime.localization?.ru?.description
    : isUkrainian
      ? anime.localization?.uk?.description
      : undefined;
  const manualFull = isRussian
    ? (manual?.descriptionRu ?? anime.descriptionRu)
    : isUkrainian
      ? anime.descriptionUk
      : anime.descriptionEn;
  const manualShort = isRussian
    ? (manual?.shortDescriptionRu ?? anime.shortDescriptionRu)
    : anime.shortDescriptionEn;
  const rawFull =
    manualFull ??
    localizedDescription ??
    (isRussian || isUkrainian
      ? anime.description || anime.synopsis
      : anime.descriptionEn || anime.synopsis || anime.description);
  const full = rawFull ? normalizeWhitespace(rawFull) : null;
  const explicitShort = manualShort ?? anime.shortDescription;
  const short = explicitShort
    ? normalizeWhitespace(explicitShort)
    : createShortDescription(full);
  const source: LocalizedAnimeDescription["source"] =
    manualFull || manualShort
      ? "manual"
      : anime.localization?.ru?.source === "shikimori" && isRussian
        ? "shikimori"
        : full
          ? isRussian && !hasRussianAnimeDescription(anime)
            ? "fallback"
            : "anilist"
          : "missing";
  const hasFullDescription = Boolean(
    full &&
    short &&
    full.length - short.length >= 36 &&
    !areDescriptionsEffectivelyEqual(short, full),
  );
  return {
    short,
    full: hasFullDescription ? full : null,
    source,
    hasFullDescription,
  };
}
export function getLocalizedAnimeDescription(
  anime: Anime,
  locale: MediaLocale,
): string {
  if (locale === "ru")
    return (
      anime.localization?.ru?.description ??
      (anime.anilistId
        ? animeLocalizationOverridesRu[anime.anilistId]?.descriptionRu
        : undefined) ??
      anime.description ??
      anime.shortDescription ??
      "Описание пока отсутствует"
    );
  if (locale === "uk")
    return (
      anime.localization?.uk?.description ??
      anime.descriptionUk ??
      anime.descriptionEn ??
      anime.synopsis ??
      anime.description ??
      "Опис поки відсутній"
    );
  return (
    anime.synopsis || anime.description || "Description is not available yet."
  );
}
export function hasRussianAnimeDescription(anime: Anime): boolean {
  return Boolean(
    anime.localization?.ru?.description ||
    (anime.anilistId
      ? animeLocalizationOverridesRu[anime.anilistId]?.descriptionRu
      : undefined),
  );
}
export function formatEpisodeCount(
  count: number | undefined,
  locale: MediaLocale,
): string {
  if (count == null) return "—";
  const numberLocale =
    locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-US";
  return `${new Intl.NumberFormat(numberLocale).format(count)} ${plural(count, locale, ["серия", "серии", "серий"], ["серія", "серії", "серій"], ["episode", "episodes"])}`;
}
export function formatDuration(
  minutes: number | undefined,
  locale: MediaLocale,
): string {
  if (minutes == null) return "—";
  const numberLocale =
    locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-US";
  return `${new Intl.NumberFormat(numberLocale).format(minutes)} ${plural(minutes, locale, ["минута", "минуты", "минут"], ["хвилина", "хвилини", "хвилин"], ["minute", "minutes"])}`;
}
export function formatScore(
  score: number | undefined,
  locale: MediaLocale,
): string {
  return score == null
    ? "—"
    : new Intl.NumberFormat(
        locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-US",
        {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        },
      ).format(score / 10);
}
function plural(
  value: number,
  locale: MediaLocale,
  ru: readonly [string, string, string],
  uk: readonly [string, string, string],
  en: readonly [string, string],
): string {
  if (locale === "en") return value === 1 ? en[0] : en[1];
  const forms = locale === "uk" ? uk : ru;
  const mod10 = value % 10,
    mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
