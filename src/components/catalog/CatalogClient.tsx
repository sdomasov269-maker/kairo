"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimeCard } from "@/components/anime/Cards";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { DiscoveryPageShell } from "@/components/layout/DiscoveryPageShell";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { BrowseEmptyState } from "@/components/ui/States";
import { useLocale } from "@/i18n";
import {
  filtersForCatalogView,
  parseCatalogParams,
  parseCatalogView,
  type CatalogView,
  type CatalogFilters,
  type CatalogPageInfo,
} from "@/lib/catalog";
import type { Anime } from "@/types/media";

export function CatalogClient({
  initialFilters,
  initialView,
  initialAnime,
  initialPageInfo,
}: {
  initialFilters: CatalogFilters;
  initialView: CatalogView;
  initialAnime: Anime[];
  initialPageInfo: CatalogPageInfo;
}) {
  const { locale, dictionary: t } = useLocale();
  const [filters, setFilters] = useState(initialFilters);
  const [view, setView] = useState<CatalogView>(initialView);
  const [anime, setAnime] = useState(initialAnime);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const request = useRef<AbortController | null>(null);
  const first = useRef(true);
  const load = useCallback(async (next: CatalogFilters, append: boolean) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (
        Array.isArray(value)
          ? value.length
          : value !== undefined && value !== ""
      )
        params.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });
    try {
      const response = await fetch(`/api/catalog?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Catalog request failed");
      const data = await response.json();
      if (controller.signal.aborted) return;
      setAnime((current) =>
        append
          ? [
              ...current,
              ...data.anime.filter(
                (item: Anime) => !current.some((known) => known.id === item.id),
              ),
            ]
          : data.anime,
      );
      setPageInfo(data.pageInfo);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void load(filters, false);
  }, [filters, load]);
  useEffect(() => {
    const onPop = () => {
      const params = Object.fromEntries(new URLSearchParams(location.search).entries());
      const nextView = parseCatalogView(params.view);
      setView(nextView);
      setFilters(filtersForCatalogView(nextView, parseCatalogParams(params)));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const change = useCallback((next: CatalogFilters) => {
    const params = new URLSearchParams(location.search);
    Object.entries(next).forEach(([key, value]) => {
      if (
        Array.isArray(value)
          ? value.length
          : value !== undefined && value !== ""
      )
        params.set(key, Array.isArray(value) ? value.join(",") : String(value));
      else params.delete(key);
    });
    params.delete("perPage");
    history.pushState(null, "", `/catalog?${params}`);
    setFilters(next);
  }, []);
  const changeView = useCallback((nextView: CatalogView) => {
    const nextFilters = filtersForCatalogView(nextView, {
      ...filters,
      search: undefined,
      genres: [],
      year: undefined,
      season: undefined,
      format: undefined,
      status: undefined,
      minimumScore: undefined,
      sort: "POPULARITY_DESC",
      page: 1,
    });
    const params = new URLSearchParams();
    if (nextView !== "genres") params.set("view", nextView);
    history.pushState(null, "", `/catalog${params.size ? `?${params}` : ""}`);
    setView(nextView);
    setFilters(nextFilters);
  }, [filters]);
  const sentinel = useCallback(
    (node: HTMLDivElement | null) => {
      observer.current?.disconnect();
      if (!node) return;
      observer.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && pageInfo.hasNextPage && !loading) {
            const next = { ...filters, page: pageInfo.currentPage + 1 };
            void load(next, true);
          }
        },
        { rootMargin: "800px" },
      );
      observer.current.observe(node);
    },
    [filters, load, loading, pageInfo],
  );
  return (
    <DiscoveryPageShell
      className="catalog-page"
      hero={<CatalogHero />}
      controls={<CatalogControls filters={filters} view={view} onChange={change} onViewChange={changeView} />}
    >
      <header className="catalog-results-heading">
        <div>
          <p className="eyebrow">{locale === "ru" ? "Каталог" : "Catalog"}</p>
          <h2>{
            view === "season"
              ? locale === "ru" ? "Этот сезон" : "This season"
              : view === "episodes"
                ? locale === "ru" ? "Новые эпизоды" : "New episodes"
                : locale === "ru" ? "Все аниме" : "All anime"
          }</h2>
        </div>
      </header>
      {anime.length ? (
        <>
          <KairoWebGLSurface className="anime-grid catalog-grid">
            {anime.map((item, index) => (
              <AnimeCard
                anime={item}
                index={index}
                compactHover
                key={item.id}
              />
            ))}
            {loading &&
              Array.from({ length: 6 }, (_, index) => (
                <div
                  className="skeleton-card catalog-infinite-skeleton"
                  key={`skeleton-${index}`}
                />
              ))}
          </KairoWebGLSurface>
          <div className="catalog-sentinel" ref={sentinel} aria-hidden="true" />
        </>
      ) : !loading ? (
        <BrowseEmptyState
          title={t.catalog.empty}
          description={t.catalog.emptyHint}
          resetLabel={t.catalog.resetAll}
          onReset={() =>
            change({
              ...filters,
              genres: [],
              search: undefined,
              year: undefined,
              season: undefined,
              format: undefined,
              status: undefined,
              minimumScore: undefined,
              sort: "POPULARITY_DESC",
              page: 1,
            })
          }
          locale={locale}
        />
      ) : null}
    </DiscoveryPageShell>
  );
}
