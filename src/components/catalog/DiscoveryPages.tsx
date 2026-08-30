"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimeCard } from "@/components/anime/Cards";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { useLocale } from "@/i18n";
import type {
  CollectionCardData,
  CollectionDetailData,
} from "@/lib/catalog/collections";
import type { Anime } from "@/types/media";
import type { PublicCatalogSource } from "@/lib/catalog/public";
import { BrowseEmptyState, EmptyState } from "@/components/ui/States";
import {
  DiscoveryPageHero,
  DiscoveryPageShell,
} from "@/components/layout/DiscoveryPageShell";
import { DiscoverySearch } from "@/components/catalog/DiscoverySearch";
import {
  BrowseFilters,
  useBrowseFilterState,
} from "@/components/catalog/BrowseFilters";
import { ReleaseDiscoveryControls } from "@/components/catalog/ReleaseDiscoveryControls";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { KairoDomCurlTarget } from "@/components/effects/KairoDomCurlTarget";
import discovery from "@/components/discovery/Discovery.module.css";

export function NewReleasesContent({
  anime,
  filter,
  dataSource,
}: {
  anime: Anime[];
  filter: string;
  dataSource: PublicCatalogSource;
}) {
  const router = useRouter();
  const { locale, dictionary: t } = useLocale();
  const { quick, setQuick, filterValues, setFilterValues, resetAll } =
    useBrowseFilterState(filter);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loadedAnime, setLoadedAnime] = useState(anime);
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(anime.length === 36);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const visibleAnime = useMemo(() => {
    const score = Number(filterValues.score || 0);
    const year = Number(filterValues.year || 0);
    const query = filterValues.search.trim().toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1;
    const currentSeason =
      month <= 3
        ? "WINTER"
        : month <= 6
          ? "SPRING"
          : month <= 9
            ? "SUMMER"
            : "FALL";
    const result = loadedAnime.filter((item) => {
      const quickMatch =
        quick === "all" ||
        ((quick === "ongoing" || quick === "releasing") &&
          item.status === "RELEASING") ||
        (quick === "finished" && item.status === "FINISHED") ||
        (quick === "announced" && item.status === "NOT_YET_RELEASED") ||
        (quick === "year" && item.year === currentYear) ||
        (quick === "season" &&
          item.year === currentYear &&
          item.season === currentSeason);
      return (
        quickMatch &&
        (!query ||
          [item.title, item.titleRu, item.titleUk, item.titleEnglish].some(
            (title) => title?.toLowerCase().includes(query),
          )) &&
        (!selectedGenres.length ||
          selectedGenres.some((genre) => item.genres.includes(genre))) &&
        (!year || item.year === year) &&
        (!filterValues.season || item.season === filterValues.season) &&
        (!filterValues.format || item.format === filterValues.format) &&
        (!filterValues.status || item.status === filterValues.status) &&
        (!score || (item.rating ?? 0) >= score)
      );
    });
    return [...result].sort((a, b) =>
      filterValues.sort === "rating"
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : filterValues.sort === "popularity"
          ? (b.popularity ?? 0) - (a.popularity ?? 0)
          : filterValues.sort === "title"
            ? a.title.localeCompare(b.title)
            : filterValues.sort === "newest"
              ? (b.year ?? 0) - (a.year ?? 0)
              : 0,
    );
  }, [filterValues, loadedAnime, quick, selectedGenres]);
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/new?filter=${encodeURIComponent(filter)}&page=${nextPage}`);
      if (!response.ok) throw new Error("New releases request failed");
      const next = (await response.json()) as { anime: Anime[]; hasMore: boolean };
      setLoadedAnime((current) => [
        ...current,
        ...next.anime.filter((item) => !current.some((known) => known.id === item.id)),
      ]);
      setNextPage((page) => page + 1);
      setHasMore(next.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, hasMore, loadingMore, nextPage]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore]);
  const sourceText = {
    ru: {
      live: "Данные AniList загружены",
      snapshot: "Показаны последние сохранённые данные каталога",
      backup: "AniList недоступен · данные получены из резервного источника",
      unavailable: "AniList временно недоступен",
      unavailableHint:
        "Новинки не удалось обновить, а сохранённой копии пока нет.",
      retry: "Попробовать снова",
    },
    uk: {
      live: "Дані AniList завантажено",
      snapshot: "Показано останні збережені дані каталогу",
      backup: "AniList недоступний · дані отримано з резервного джерела",
      unavailable: "AniList тимчасово недоступний",
      unavailableHint:
        "Новинки не вдалося оновити, а збереженої копії поки немає.",
      retry: "Спробувати знову",
    },
    en: {
      live: "AniList data loaded",
      snapshot: "Showing the latest saved catalog data",
      backup: "AniList unavailable · showing backup source data",
      unavailable: "AniList is temporarily unavailable",
      unavailableHint:
        "New releases could not be updated and no saved snapshot is available yet.",
      retry: "Try again",
    },
  }[locale];
  return (
    <DiscoveryPageShell
      className="catalog-page new-page"
      hero={
        <DiscoveryPageHero
          eyebrow={t.discovery.latestAdditions}
          title={t.nav.releases}
          description={t.discovery.releasesDescription}
        />
      }
      controls={
        <ReleaseDiscoveryControls
          value={filterValues}
          onChange={setFilterValues}
          selectedGenres={selectedGenres}
          onSelectedGenresChange={setSelectedGenres}
          onResetAll={() => setQuick("all")}
        />
      }
    >
      {dataSource !== "unavailable" && (
        <p className={`catalog-data-state is-${dataSource}`} role="status">
          {sourceText[dataSource]}
        </p>
      )}
      {dataSource === "unavailable" ? (
        <BrowseEmptyState
          title={sourceText.unavailable}
          description={sourceText.unavailableHint}
          resetLabel={sourceText.retry}
          onReset={() => router.refresh()}
        />
      ) : visibleAnime.length ? (
        <KairoWebGLSurface className="anime-grid catalog-grid">
          {visibleAnime.map((item, index) => (
            <AnimeCard anime={item} index={index} key={item.slug} />
          ))}
        </KairoWebGLSurface>
      ) : (
        <BrowseEmptyState
          title={t.catalog.empty}
          description={t.catalog.emptyHint}
          resetLabel={t.catalog.resetAll}
          onReset={() => {
            resetAll();
            setSelectedGenres([]);
          }}
        />
      )}
      {dataSource !== "unavailable" && hasMore && (
        <div className="catalog-sentinel" ref={sentinel} aria-hidden="true" />
      )}
    </DiscoveryPageShell>
  );
}

export function CollectionsContent({
  collections,
}: {
  collections: CollectionCardData[];
}) {
  const { locale, dictionary: t } = useLocale();
  const { quick, setQuick, filterValues, setFilterValues, resetAll } =
    useBrowseFilterState();
  const genres = useMemo(
    () =>
      [
        ...new Set(
          collections.flatMap((collection) =>
            collection.anime.flatMap((item) => item.genres),
          ),
        ),
      ].sort(),
    [collections],
  );
  const visibleCollections = useMemo(() => {
    const query = filterValues.search.trim().toLowerCase();
    const minimumCount = Number(filterValues.minimumCount || 0);
    const result = collections.filter(
      (collection) =>
        (quick === "all" || collection.slug === quick) &&
        (!query ||
          t.discovery[collection.titleKey].toLowerCase().includes(query) ||
          collection.anime.some((item) =>
            [
              item.title,
              item.titleRu,
              item.titleUk,
              item.titleEnglish,
              item.titleRomaji,
              item.titleNative,
              ...(item.synonyms ?? []),
            ].some((title) => title?.toLowerCase().includes(query)),
          )) &&
        (!filterValues.genre ||
          collection.anime.some((item) =>
            item.genres.includes(filterValues.genre),
          )) &&
        (!minimumCount || collection.count >= minimumCount),
    );
    const average = (
      collection: CollectionCardData,
      key: "rating" | "popularity",
    ) =>
      collection.anime.reduce((sum, item) => sum + (item[key] ?? 0), 0) /
      Math.max(collection.anime.length, 1);
    return [...result].sort((a, b) =>
      filterValues.sort === "count"
        ? b.count - a.count
        : filterValues.sort === "rating"
          ? average(b, "rating") - average(a, "rating")
          : filterValues.sort === "popularity"
            ? average(b, "popularity") - average(a, "popularity")
            : filterValues.sort === "title"
              ? t.discovery[a.titleKey].localeCompare(t.discovery[b.titleKey])
              : 0,
    );
  }, [collections, filterValues, quick, t]);
  return (
    <DiscoveryPageShell
      className={discovery.page}
      hero={
        <DiscoveryPageHero
          eyebrow={locale === "ru" ? "ВЫБОР РЕДАКЦИИ" : locale === "uk" ? "ВИБІР РЕДАКЦІЇ" : "EDITOR'S CHOICE"}
          title={locale === "ru" ? "Истории, собранные с вниманием" : locale === "uk" ? "Історії, зібрані з увагою" : "Stories, thoughtfully collected"}
          description={t.discovery.collectionsDescription}
        >
          <p className={discovery.index}>03 KAIRO / {locale === "en" ? "COLLECTIONS" : "КОЛЛЕКЦИИ"}</p>
        </DiscoveryPageHero>
      }
      controls={
        <section className={`${discovery.surface} ${discovery.collectionsControls}`} aria-labelledby="collections-discovery-title">
          <header className={discovery.surfaceHead}>
            <div>
              <p className={discovery.surfaceEyebrow}>{locale === "ru" ? "БИБЛИОТЕКА KAIRO" : locale === "uk" ? "БІБЛІОТЕКА KAIRO" : "KAIRO LIBRARY"}</p>
              <h2 id="collections-discovery-title">{locale === "ru" ? "Выберите свою коллекцию" : locale === "uk" ? "Оберіть свою колекцію" : "Choose your collection"}</h2>
              <p className={discovery.surfaceDescription}>{locale === "ru" ? "Редакционные подборки для разных настроений и маршрутов просмотра." : locale === "uk" ? "Редакційні добірки для різних настроїв і маршрутів перегляду." : "Editorial selections for every mood and viewing path."}</p>
            </div>
          </header>
          <div className={discovery.collectionsTools}>
            <BrowseFilters
              value={filterValues}
              onChange={setFilterValues}
              genres={genres}
              quickFilters={[
                ["all", t.discovery.all],
                ["popular", t.discovery.popular],
                ["top-rated", t.discovery.topRated],
                ["new-releases", t.discovery.newReleases],
              ]}
              quickValue={quick}
              onQuickChange={setQuick}
              resultCount={visibleCollections.length}
              mode="collections"
              onResetAll={() => setQuick("all")}
            />
          </div>
        </section>
      }
    >
      <header className={discovery.resultsHead}>
        <div>
          <p className={discovery.resultsEyebrow}>{locale === "ru" ? "КОЛЛЕКЦИИ" : locale === "uk" ? "КОЛЕКЦІЇ" : "COLLECTIONS"}</p>
          <h2>{locale === "ru" ? "Начните с подборки" : locale === "uk" ? "Почніть із добірки" : "Start with a collection"}</h2>
        </div>
      </header>
      {visibleCollections.length ? (
        <KairoWebGLSurface className={`${discovery.collectionGrid} system-collection-grid`}>
          {visibleCollections.map((collection) => {
            const preview = collection.anime.slice(0, 4);
            return (
              <Link
                className={`${discovery.collectionCard} system-collection-card`}
                href={`/collections/${collection.slug}`}
                key={collection.slug}
              >
                <div className="collection-mosaic" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => {
                    const anime = preview[index % preview.length];
                    return anime ? (
                      <AnimePoster
                        anime={anime}
                        sizes="(max-width: 600px) 35vw, 180px"
                        key={`${anime.slug}-${index}`}
                      />
                    ) : null;
                  })}
                </div>
                <KairoDomCurlTarget kind="text">
                  <h2>{t.discovery[collection.titleKey]}</h2>
                  <p>{collection.count}</p>
                </KairoDomCurlTarget>
              </Link>
            );
          })}
        </KairoWebGLSurface>
      ) : (
        <BrowseEmptyState
          title={t.catalog.empty}
          description={t.catalog.emptyHint}
          resetLabel={t.catalog.resetAll}
          onReset={resetAll}
        />
      )}
    </DiscoveryPageShell>
  );
}

export function CollectionDetailContent({
  collection,
  anime,
}: {
  collection: CollectionDetailData;
  anime: Anime[];
}) {
  const { dictionary: t } = useLocale();
  return (
    <DiscoveryPageShell
      hero={
        <DiscoveryPageHero
          eyebrow={String(anime.length)}
          title={t.discovery[collection.titleKey]}
        >
          <Link className="back-link-static" href="/collections">
            ← {t.nav.collections}
          </Link>
        </DiscoveryPageHero>
      }
      search={<DiscoverySearch />}
    >
      {anime.length ? (
        <KairoWebGLSurface className="anime-grid">
          {anime.map((item, index) => (
            <AnimeCard anime={item} index={index} key={item.slug} />
          ))}
        </KairoWebGLSurface>
      ) : (
        <EmptyState title={t.discovery.emptyCollection} />
      )}
    </DiscoveryPageShell>
  );
}
