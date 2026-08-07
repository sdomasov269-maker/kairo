"use client";

import { useLocale } from "@/i18n";
import { DiscoveryPageHero } from "@/components/layout/DiscoveryPageShell";

export function CatalogHero() {
  const { dictionary: t } = useLocale();
  return (
    <DiscoveryPageHero
      eyebrow="Kairo index"
      title={t.catalog.title}
      description={t.catalog.description}
    />
  );
}
