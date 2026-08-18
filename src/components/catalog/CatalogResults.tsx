"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimeCard } from "@/components/anime/Cards";
import { useLocale } from "@/i18n";
import {
  pluralizeTitles,
  updateCatalogParam,
  type CatalogPageInfo,
} from "@/lib/catalog";
import type { Anime } from "@/types/media";
import { BrowseEmptyState } from "@/components/ui/States";
import { localizeGenre } from "@/lib/media-localization";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";

export function CatalogResults({
  anime,
  pageInfo,
  fallback,
  query,
}: {
  anime: Anime[];
  pageInfo: CatalogPageInfo;
  fallback: boolean;
  query: string;
}) {
  const { locale, dictionary: t } = useLocale();
  const router = useRouter();
  const selectedGenre = new URLSearchParams(query).get("genres")?.split(",")[0];
  const heading = selectedGenre
    ? localizeGenre(selectedGenre, locale)
    : locale === "ru"
      ? "Все аниме"
      : locale === "uk"
        ? "Усе аніме"
        : "All anime";
  const pageHref = (page: number) =>
    `/catalog?${updateCatalogParam(new URLSearchParams(query), "page", String(page))}`;
  if (!anime.length)
    return (
      <BrowseEmptyState
        title={t.catalog.empty}
        description={t.catalog.emptyHint}
        resetLabel={t.catalog.resetAll}
        onReset={() => router.replace("/catalog")}
        locale={locale}
      />
    );
  return (
    <>
      <header className="catalog-results-heading">
        <div>
          <p className="eyebrow">
            {locale === "ru"
              ? "Каталог"
              : locale === "uk"
                ? "Каталог"
                : "Catalog"}
          </p>
          <h2>{heading}</h2>
          <p>
            {locale === "ru"
              ? "Популярные тайтлы категории"
              : locale === "uk"
                ? "Популярні тайтли категорії"
                : "Popular titles in this category"}
          </p>
        </div>
        <div className="catalog-result-meta" aria-live="polite">
          {t.catalog.found} <strong>{pageInfo.total}</strong>{" "}
          {pluralizeTitles(pageInfo.total, locale)}
          {fallback && <span>{t.catalog.demo}</span>}
        </div>
      </header>
      <KairoWebGLSurface className="anime-grid catalog-grid">
        {anime.map((item, index) => (
          <AnimeCard anime={item} index={index} key={item.id} />
        ))}
      </KairoWebGLSurface>
      {!fallback && pageInfo.lastPage > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {pageInfo.currentPage > 1 ? (
            <Link href={pageHref(pageInfo.currentPage - 1)}>
              {t.catalog.previous}
            </Link>
          ) : (
            <span aria-disabled="true">{t.catalog.previous}</span>
          )}
          <strong>
            {pageInfo.currentPage} / {pageInfo.lastPage}
          </strong>
          {pageInfo.hasNextPage ? (
            <Link href={pageHref(pageInfo.currentPage + 1)}>
              {t.catalog.next}
            </Link>
          ) : (
            <span aria-disabled="true">{t.catalog.next}</span>
          )}
        </nav>
      )}
    </>
  );
}
