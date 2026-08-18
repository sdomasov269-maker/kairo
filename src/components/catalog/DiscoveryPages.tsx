"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { KairoDomCurlTarget } from "@/components/effects/KairoDomCurlTarget";

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
  const quickOptions: Array<[string, string]> = [
    ["all", t.discovery.all],
    ["ongoing", t.discovery.releasing],
    ["finished", t.discovery.finished],
    ["announced", t.discovery.announced],
    ["season", t.discovery.thisSeason],
    ["year", t.discovery.thisYear],
  ];
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
    const result = anime.filter((item) => {
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
        (!filterValues.genre || item.genres.includes(filterValues.genre)) &&
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
  }, [anime, filterValues, quick]);
  const genres = useMemo(
    () => [...new Set(anime.flatMap((item) => item.genres))].sort(),
    [anime],
  );
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
      hero={
        <DiscoveryPageHero
          eyebrow={t.discovery.latestAdditions}
          title={t.nav.releases}
          description={t.discovery.releasesDescription}
        />
      }
      controls={
        <BrowseFilters
          value={filterValues}
          onChange={setFilterValues}
          genres={genres}
          quickFilters={quickOptions}
          quickValue={quick}
          onQuickChange={setQuick}
          resultCount={visibleAnime.length}
          mode="releases"
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
        <KairoWebGLSurface className="anime-grid">
          {visibleAnime.map((item, index) => (
            <AnimeCard anime={item} index={index} key={item.slug} />
          ))}
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

export function CollectionsContent({
  collections,
}: {
  collections: CollectionCardData[];
}) {
  const { dictionary: t } = useLocale();
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
      hero={
        <DiscoveryPageHero
          eyebrow={t.sections.curated}
          title={t.nav.collections}
          description={t.discovery.collectionsDescription}
        />
      }
      controls={
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
      }
    >
      {visibleCollections.length ? (
        <KairoWebGLSurface className="system-collection-grid">
          {visibleCollections.map((collection) => {
            const preview = collection.anime.slice(0, 4);
            return (
              <Link
                className="system-collection-card"
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
