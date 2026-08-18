export function resolveEpisodeTitle(input: {
  locale: "ru" | "uk" | "en";
  episodeNumber: number;
  title?: string | null;
  titleRu?: string | null;
  titleUk?: string | null;
}) {
  const localized =
    input.locale === "uk"
      ? input.titleUk
      : input.locale === "ru"
        ? input.titleRu
        : input.title;
  return (
    localized ?? input.titleRu ?? input.title ?? `Серия ${input.episodeNumber}`
  );
}

export const sortSeasons = <T extends { sortOrder: number; number: number }>(
  items: T[],
) =>
  [...items].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.number - right.number,
  );

export const sortEpisodes = <T extends { number: number }>(items: T[]) =>
  [...items].sort((left, right) => left.number - right.number);

export function adjacentEpisodes<T extends { number: number }>(
  items: T[],
  episodeNumber: number,
) {
  const sorted = sortEpisodes(items);
  const index = sorted.findIndex((episode) => episode.number === episodeNumber);
  return {
    previous: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 ? (sorted[index + 1] ?? null) : null,
  };
}
