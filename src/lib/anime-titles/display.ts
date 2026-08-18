export type AnimeBaseTitles = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

const clean = (value?: string | null) => value?.trim() || null;

export function resolveDisplayAnimeTitle(params: {
  locale: "ru" | "uk" | "en";
  localizedRu?: string | null;
  localizedUk?: string | null;
  base: AnimeBaseTitles;
}): string {
  const { locale, localizedRu, localizedUk, base } = params;
  const candidates =
    locale === "ru"
      ? [localizedRu, base.english, base.romaji, base.native]
      : locale === "uk"
        ? [localizedUk, base.english, base.romaji, base.native]
        : [base.english, base.romaji, base.native];
  return (
    candidates.map(clean).find((value): value is string => Boolean(value)) ??
    (locale === "ru"
      ? "Название неизвестно"
      : locale === "uk"
        ? "Назва невідома"
        : "Unknown title")
  );
}
