import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { AppShell } from "@/components/layout/AppShell";
import {
  currentCatalogSeason,
  filtersForCatalogView,
  parseCatalogParams,
  parseCatalogView,
} from "@/lib/catalog";
import { normalizeAnimeTitle } from "@/lib/catalog/identity";
import { getPublicCatalog } from "@/lib/catalog/public";
import {
  AniListRequestError,
  mapAniListAnime,
  searchAnimeCatalog,
} from "@/lib/anilist";
import type { CatalogPageInfo } from "@/lib/catalog";
import type { AniListMedia } from "@/lib/anilist";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import { getJikanAnimeBySearch, mapJikanAnime } from "@/lib/jikan";
import type { Anime } from "@/types/media";
import { enrichAnimeListWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";
import { listAnime } from "@/server/repositories/anime.repository";
import { listCatalogSnapshotAnime } from "@/lib/catalog/snapshot";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = Object.values(params).some(Boolean);
  return {
    title: "Каталог аниме — Kairo",
    description:
      "Ищите аниме по жанру, году, рейтингу, формату и статусу в каталоге Kairo.",
    alternates: { canonical: "/catalog" },
    robots: hasFilters ? { index: false, follow: true } : undefined,
  };
}
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const raw = await searchParams;
  const view = parseCatalogView(raw.view);
  const filters = filtersForCatalogView(view, parseCatalogParams(raw));
  const [databaseCatalog, snapshotCatalog] = await Promise.all([
    listAnime().catch(() => []),
    listCatalogSnapshotAnime().catch(() => []),
  ]);
  const localCatalog = [
    ...new Map(
      [...databaseCatalog, ...snapshotCatalog].map((item) => [item.id, item]),
    ).values(),
  ];
  let remotePage: {
    media: AniListMedia[];
    pageInfo: CatalogPageInfo;
  } | null = null;
  let backupSearchAnime: Anime[] | null = null;
  if (!localCatalog.length) {
    try {
      remotePage = await searchAnimeCatalog(filters);
    } catch (error) {
      if (!(error instanceof AniListRequestError)) throw error;
      if (filters.search) {
        const backup = await getJikanAnimeBySearch(filters.search);
        if (backup.ok && backup.data) {
          backupSearchAnime = [
            applyCanonicalTitleLocalization(mapJikanAnime(backup.data)),
          ];
        }
      }
    }
  }
  const remoteAnime =
    backupSearchAnime ??
    remotePage?.media.map(mapAniListAnime).map(applyCanonicalTitleLocalization);
  const publicCatalog = localCatalog.length
    ? localCatalog
    : remoteAnime?.length
      ? await enrichAnimeListWithLocalizedTitles(remoteAnime)
      : await getPublicCatalog();
  const currentSeason = currentCatalogSeason();
  const catalogSeasons = [0, 1, 2, 3].map((offset) =>
    currentCatalogSeason(
      new Date(currentSeason.year, new Date().getMonth() - offset * 3, 1),
    ),
  );
  const seasonalCatalog = localCatalog.length
    ? []
    : (
        await Promise.all(
          catalogSeasons.map(({ season, year }) =>
            getPublicCatalog({ season, seasonYear: year, perPage: 50 }),
          ),
        )
      ).flat();
  const overviewAnime = [
    ...new Map(
      [...localCatalog, ...publicCatalog, ...seasonalCatalog].map((item) => [item.id, item]),
    ).values(),
  ];
  const normalizedSearch = filters.search
    ? normalizeAnimeTitle(filters.search)
    : undefined;
  const curated = publicCatalog.filter(
    (item) =>
      (!normalizedSearch ||
        [
          item.title,
          item.titleRu,
          item.titleUk,
          item.titleEnglish,
          item.titleNative,
          item.titleRomaji,
          ...(item.localization?.ru?.synonyms ?? []),
          ...(item.localization?.uk?.synonyms ?? []),
          ...(item.synonyms ?? []),
        ].some(
          (title) =>
            title && normalizeAnimeTitle(title).includes(normalizedSearch),
        )) &&
      (!filters.genres.length ||
        filters.genres.every((genre) => item.genres.includes(genre))) &&
      (!filters.year || item.year === filters.year) &&
      (!filters.season || item.season === filters.season) &&
      (!filters.format || item.format === filters.format) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.minimumScore ||
        (item.rating ?? 0) >= filters.minimumScore / 10),
  );
  const hasRemoteResult = Boolean(remotePage || backupSearchAnime);
  const start = hasRemoteResult ? 0 : (filters.page - 1) * filters.perPage;
  const anime = hasRemoteResult
    ? curated
    : curated.slice(start, start + filters.perPage);
  const pageInfo = remotePage?.pageInfo ?? {
    currentPage: filters.page,
    lastPage: Math.max(1, Math.ceil(curated.length / filters.perPage)),
    hasNextPage: start + filters.perPage < curated.length,
    total: curated.length,
  };
  return (
    <AppShell className="app-shell-discovery app-shell-catalog">
      <CatalogClient
        initialFilters={filters}
        initialView={view}
        initialAnime={anime}
        overviewAnime={overviewAnime}
        initialPageInfo={pageInfo}
      />
    </AppShell>
  );
}
