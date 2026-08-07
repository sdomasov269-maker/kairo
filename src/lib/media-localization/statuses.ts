import type { MediaLocale, NullableMediaValue } from "./types";

export const KAIRO_STATUSES = [
  "RELEASING",
  "FINISHED",
  "NOT_YET_RELEASED",
  "HIATUS",
  "CANCELLED",
] as const;

const values: Readonly<Record<string, readonly [string, string, string]>> = {
  RELEASING: ["Онгоинг", "Виходить", "Ongoing"],
  FINISHED: ["Завершено", "Завершено", "Finished"],
  NOT_YET_RELEASED: ["Анонс", "Анонс", "Announced"],
  HIATUS: ["Приостановлено", "Призупинено", "On hiatus"],
  CANCELLED: ["Отменено", "Скасовано", "Cancelled"],
};

export const localizeStatus = (
  value: NullableMediaValue,
  locale: MediaLocale,
): string => {
  if (!value) return "—";
  const localized = values[value];
  if (!localized) {
    if (process.env.NODE_ENV === "development")
      console.warn(`[Kairo] Unknown anime status: ${value}`);
    return locale === "ru"
      ? "Статус неизвестен"
      : locale === "uk"
        ? "Статус невідомий"
        : "Unknown status";
  }
  return localized[locale === "ru" ? 0 : locale === "uk" ? 1 : 2];
};

export const isUpcomingStatus = (value: NullableMediaValue): boolean =>
  value === "NOT_YET_RELEASED";
