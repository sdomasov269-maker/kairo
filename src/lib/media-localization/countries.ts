import type { MediaLocale, NullableMediaValue } from "./types";
const values: Readonly<Record<string, readonly [string, string, string]>> = {
  JP: ["Япония", "Японія", "Japan"],
  KR: ["Южная Корея", "Південна Корея", "South Korea"],
  CN: ["Китай", "Китай", "China"],
  TW: ["Тайвань", "Тайвань", "Taiwan"],
  US: ["США", "США", "United States"],
  GB: ["Великобритания", "Велика Британія", "United Kingdom"],
  FR: ["Франция", "Франція", "France"],
};
export const localizeCountry = (
  value: NullableMediaValue,
  locale: MediaLocale,
): string =>
  value
    ? (values[value]?.[locale === "ru" ? 0 : locale === "uk" ? 1 : 2] ?? value)
    : "—";
