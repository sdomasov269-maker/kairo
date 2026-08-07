import type { Anime } from "../../types/media.ts";
import { resolveDisplayAnimeTitle } from "./display.ts";

export type AppTitleLocale = "ru" | "uk" | "en";
export type LocalizedTitleEntry = { ru?: string; uk?: string; aliases: string[] };
export type PublicAnimeCard = Anime & { displayTitle: string; displayTitleLocale: AppTitleLocale };

export function normalizeAnimeTitleLocale(locale: string | null | undefined): AppTitleLocale {
  const normalized = locale?.toLowerCase();
  if (normalized?.startsWith("ru")) return "ru";
  if (normalized?.startsWith("uk") || normalized?.startsWith("ua")) return "uk";
  return "en";
}

export function applyLocalizedTitles<T extends Anime>(anime: T[], localized: Map<number, LocalizedTitleEntry>, locale?: string | null): Array<T | PublicAnimeCard> {
  const normalizedLocale = locale == null ? null : normalizeAnimeTitleLocale(locale);
  return anime.map((item) => {
    const entry = item.anilistId ? localized.get(item.anilistId) : undefined;
    const enriched: T = {
      ...item,
      titleRu: entry?.ru ?? item.titleRu,
      titleUk: entry?.uk ?? item.titleUk,
      synonyms: [...new Set([...(item.synonyms ?? []), ...(entry?.aliases ?? [])])],
      localization: {
        ...item.localization,
        ru: { ...item.localization?.ru, title: entry?.ru ?? item.localization?.ru?.title, synonyms: [...new Set([...(item.localization?.ru?.synonyms ?? []), ...(entry?.aliases ?? [])])], source: entry?.ru ? "shikimori" : item.localization?.ru?.source ?? "missing" },
        uk: { ...item.localization?.uk, title: entry?.uk ?? item.localization?.uk?.title, synonyms: [...new Set([...(item.localization?.uk?.synonyms ?? []), ...(entry?.aliases ?? [])])], source: entry?.uk ? "fallback" : item.localization?.uk?.source ?? "missing" },
      },
    };
    if (!normalizedLocale) return enriched;
    return { ...enriched, displayTitleLocale: normalizedLocale, displayTitle: resolveDisplayAnimeTitle({ locale: normalizedLocale, localizedRu: enriched.titleRu, localizedUk: enriched.titleUk, base: { english: enriched.titleEnglish ?? enriched.title ?? null, romaji: enriched.titleRomaji ?? null, native: enriched.titleNative ?? null } }) };
  });
}

export async function localizePublicAnimeListWithLoader<T extends Anime>(anime: T[], locale: string | null | undefined, load: (ids: number[]) => Promise<Map<number, LocalizedTitleEntry>>): Promise<PublicAnimeCard[]> {
  const ids = [...new Set(anime.map((item) => item.anilistId).filter((id): id is number => Number.isSafeInteger(id) && id! > 0))];
  const localized = ids.length ? await load(ids) : new Map<number, LocalizedTitleEntry>();
  return applyLocalizedTitles(anime, localized, locale) as PublicAnimeCard[];
}
