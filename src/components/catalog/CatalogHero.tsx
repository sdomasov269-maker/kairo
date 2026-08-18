"use client";

import { useLocale } from "@/i18n";
import { DiscoveryPageHero } from "@/components/layout/DiscoveryPageShell";

export function CatalogHero() {
  const { locale, dictionary: t } = useLocale();
  const copy = {
    ru: {
      eyebrow: "Категории",
      title: "Найди историю по настроению",
      description:
        "Жанры, темы и направления аниме — в одном спокойном пространстве для исследования.",
    },
    uk: {
      eyebrow: "Категорії",
      title: "Знайди історію за настроєм",
      description:
        "Жанри, теми й напрями аніме — в одному спокійному просторі для дослідження.",
    },
    en: {
      eyebrow: "Categories",
      title: "Find a story for your mood",
      description:
        "Genres, themes and directions in anime — one calm space to explore them all.",
    },
  }[locale];
  return (
    <DiscoveryPageHero
      eyebrow={copy.eyebrow}
      title={copy.title || t.catalog.title}
      description={copy.description || t.catalog.description}
    />
  );
}
