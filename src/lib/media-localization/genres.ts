import type { MediaLocale, NullableMediaValue } from "./types";
const genres: Readonly<Record<string, readonly [string, string]>> = {
  Action: ["Боевик", "Бойовик"],
  Adventure: ["Приключения", "Пригоди"],
  Comedy: ["Комедия", "Комедія"],
  Drama: ["Драма", "Драма"],
  Ecchi: ["Этти", "Етті"],
  Fantasy: ["Фэнтези", "Фентезі"],
  Horror: ["Ужасы", "Жахи"],
  "Mahou Shoujo": ["Махо-сёдзё", "Махо-сьодзьо"],
  Mecha: ["Меха", "Меха"],
  Music: ["Музыка", "Музика"],
  Mystery: ["Мистика", "Містика"],
  Psychological: ["Психологическое", "Психологічне"],
  Romance: ["Романтика", "Романтика"],
  "Sci-Fi": ["Научная фантастика", "Наукова фантастика"],
  "Slice of Life": ["Повседневность", "Повсякденність"],
  Sports: ["Спорт", "Спорт"],
  Supernatural: ["Сверхъестественное", "Надприродне"],
  Thriller: ["Триллер", "Трилер"],
};
export const localizeGenre = (
  value: NullableMediaValue,
  locale: MediaLocale,
): string =>
  value
    ? locale === "en"
      ? value
      : (genres[value]?.[locale === "ru" ? 0 : 1] ?? value)
    : "";
