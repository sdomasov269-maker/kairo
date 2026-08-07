"use client";

import { useLocale } from "@/i18n";

export function DiscoverySearch() {
  const { dictionary: t } = useLocale();

  return (
    <form className="catalog-search discovery-search" action="/catalog">
      <label className="sr-only" htmlFor="discovery-search">
        {t.catalog.placeholder}
      </label>
      <input
        id="discovery-search"
        name="search"
        placeholder={t.catalog.placeholder}
        type="search"
      />
      <button className="button button-primary" type="submit">
        {t.catalog.find}
      </button>
    </form>
  );
}
