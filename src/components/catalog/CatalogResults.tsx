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
      <div className="catalog-result-meta" aria-live="polite">
        <p>
          {t.catalog.found} <strong>{pageInfo.total}</strong>{" "}
          {pluralizeTitles(pageInfo.total, locale)}
        </p>
        {fallback && <span>{t.catalog.demo}</span>}
      </div>
      <div className="anime-grid catalog-grid">
        {anime.map((item, index) => (
          <AnimeCard anime={item} index={index} key={item.id} />
        ))}
      </div>
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
