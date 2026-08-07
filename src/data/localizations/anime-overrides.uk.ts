export interface UkrainianAnimeOverride {
  titleUk: string;
  descriptionUk?: string;
  synonymsUk?: string[];
}

/**
 * Curated Ukrainian titles. This layer is deliberately separate from API data:
 * AniList and Shikimori do not provide a dependable Ukrainian title catalogue.
 */
export const animeLocalizationOverridesUk: Record<
  number,
  UkrainianAnimeOverride
> = {
  1: { titleUk: "Ковбой Бібоп" },
  5114: { titleUk: "Сталевий алхімік: Братерство" },
  1535: { titleUk: "Зошит смерті" },
  16498: { titleUk: "Атака титанів" },
  140960: { titleUk: "Сім’я шпигуна" },
  154587: { titleUk: "Фрірен: Після кінця подорожі" },
};
