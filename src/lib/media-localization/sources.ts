import type { MediaLocale, NullableMediaValue } from "./types";
const values: Readonly<Record<string, readonly [string, string]>> = {
  ORIGINAL: ["Оригинальный проект", "Original"],
  MANGA: ["Манга", "Manga"],
  LIGHT_NOVEL: ["Ранобэ", "Light novel"],
  VISUAL_NOVEL: ["Визуальная новелла", "Visual novel"],
  VIDEO_GAME: ["Видеоигра", "Video game"],
  OTHER: ["Другое", "Other"],
  NOVEL: ["Роман", "Novel"],
  DOUJINSHI: ["Додзинси", "Doujinshi"],
  ANIME: ["Аниме", "Anime"],
  WEB_NOVEL: ["Веб-роман", "Web novel"],
  LIVE_ACTION: ["Игровое кино", "Live action"],
  GAME: ["Игра", "Game"],
  COMIC: ["Комикс", "Comic"],
  MULTIMEDIA_PROJECT: ["Мультимедийный проект", "Multimedia project"],
  PICTURE_BOOK: ["Книга с иллюстрациями", "Picture book"],
};
export const localizeSource = (
  value: NullableMediaValue,
  locale: MediaLocale,
): string =>
  value ? (values[value]?.[locale === "ru" ? 0 : 1] ?? value) : "—";
