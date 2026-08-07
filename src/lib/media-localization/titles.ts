import { animeLocalizationOverridesRu } from "../../data/localizations/anime-overrides.ru.ts";
import { animeLocalizationOverridesUk } from "../../data/localizations/anime-overrides.uk.ts";
import type { Anime } from "../../types/media.ts";
import type { MediaLocale } from "./types.ts";
import { resolveDisplayAnimeTitle } from "../anime-titles/display.ts";

const cleanTitle = (value?: string | null) => {
  const title = value?.trim();
  return title || undefined;
};

const firstTitle = (
  candidates: Array<string | null | undefined>,
  fallback: string,
) => candidates.map(cleanTitle).find(Boolean) ?? fallback;

export function resolveAnimeTitle(anime: Anime, locale: MediaLocale): string {
  const manualTitle = anime.anilistId
    ? animeLocalizationOverridesRu[anime.anilistId]?.titleRu
    : undefined;

  const manualUk = anime.anilistId
    ? animeLocalizationOverridesUk[anime.anilistId]?.titleUk
    : undefined;
  return resolveDisplayAnimeTitle({
    locale,
    localizedRu: firstTitle([anime.localization?.ru?.title, manualTitle, anime.titleRu], ""),
    localizedUk: firstTitle([anime.localization?.uk?.title, manualUk, anime.titleUk], ""),
    base: {
      english: anime.titleEnglish ?? anime.title ?? null,
      romaji: anime.titleRomaji ?? null,
      native: anime.titleNative ?? null,
    },
  });
}

// Backwards-compatible public name for existing consumers.
export const getLocalizedAnimeTitle = resolveAnimeTitle;

export function resolveAnimeOriginalTitle(
  anime: Anime,
  locale: MediaLocale,
): string | undefined {
  const displayed = resolveAnimeTitle(anime, locale).toLocaleLowerCase();
  return [anime.titleRomaji, anime.titleNative]
    .map(cleanTitle)
    .find((title) => title?.toLocaleLowerCase() !== displayed);
}

export function applyCanonicalTitleLocalization(anime: Anime): Anime {
  const titleRu = anime.anilistId
    ? animeLocalizationOverridesRu[anime.anilistId]?.titleRu
    : undefined;
  if (!titleRu || anime.localization?.ru?.title) return anime;

  return {
    ...anime,
    titleRu: anime.titleRu ?? titleRu,
    localization: {
      ...anime.localization,
      ru: {
        ...anime.localization?.ru,
        title: titleRu,
        source: "manual",
      },
    },
  };
}

export function getAlternativeTitles(
  anime: Anime,
  locale: MediaLocale,
): string[] {
  const excluded = new Set(
    [
      resolveAnimeTitle(anime, locale),
      anime.title,
      anime.titleRu,
      anime.titleEnglish,
      anime.titleRomaji,
      anime.titleNative,
    ]
      .filter(Boolean)
      .map((value) => value!.trim().toLocaleLowerCase()),
  );
  const seen = new Set<string>();
  const ordered = [
    ...(locale === "ru" ? (anime.localization?.ru?.synonyms ?? []) : []),
    ...(locale === "uk" ? (anime.localization?.uk?.synonyms ?? []) : []),
    ...(anime.synonyms ?? []),
  ];
  return ordered.filter((value) => {
    const key = value.trim().toLocaleLowerCase();
    if (!key || excluded.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
