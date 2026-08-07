import type { MediaLocale, NullableMediaValue } from "./types";
const values: Readonly<Record<string, readonly [string, string, string]>> = {
  TV: ["Сериал", "Серіал", "TV series"],
  TV_SHORT: ["Короткий сериал", "Короткий серіал", "Short series"],
  MOVIE: ["Фильм", "Фільм", "Movie"],
  SPECIAL: ["Спешл", "Спецвипуск", "Special"],
  OVA: ["OVA", "OVA", "OVA"],
  ONA: ["ONA", "ONA", "ONA"],
  MUSIC: ["Музыкальное видео", "Музичне відео", "Music video"],
};
export const localizeFormat = (
  value: NullableMediaValue,
  locale: MediaLocale,
): string =>
  value
    ? (values[value]?.[locale === "ru" ? 0 : locale === "uk" ? 1 : 2] ?? value)
    : "—";
