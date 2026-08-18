export function buildMissingTitleWhere(locale: "ru" | "uk" | "all") {
  if (locale === "ru")
    return { localizedTitles: { none: { locale: "RU" as const } } };
  if (locale === "uk")
    return { localizedTitles: { none: { locale: "UK" as const } } };
  return {
    OR: [
      { localizedTitles: { none: { locale: "RU" as const } } },
      { localizedTitles: { none: { locale: "UK" as const } } },
    ],
  };
}

export function wikidataRuEnabled(options: {
  fallbackWikidata: boolean;
  provider?: string;
  skipWikidata: boolean;
}) {
  return (
    !options.skipWikidata &&
    (options.fallbackWikidata || options.provider === "wikidata")
  );
}
