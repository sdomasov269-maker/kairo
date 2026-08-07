import type { MediaLocale, NullableMediaValue } from "./types";
const values: Readonly<Record<string, readonly [string, string, string]>> = {
  WINTER: ["Зима", "Зима", "Winter"],
  SPRING: ["Весна", "Весна", "Spring"],
  SUMMER: ["Лето", "Літо", "Summer"],
  FALL: ["Осень", "Осінь", "Fall"],
};
export function localizeSeason(
  value: NullableMediaValue,
  locale: MediaLocale,
  year?: number,
): string {
  if (!value) return "—";
  const label =
    values[value]?.[locale === "ru" ? 0 : locale === "uk" ? 1 : 2] ?? value;
  return year ? `${label} ${year}` : label;
}
