import type { Metadata } from "next";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { CatalogResults } from "@/components/catalog/CatalogResults";
import { AppShell } from "@/components/layout/AppShell";
import { DiscoveryPageShell } from "@/components/layout/DiscoveryPageShell";
import { parseCatalogParams } from "@/lib/catalog";
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
  const filters = parseCatalogParams(raw);
  let remotePage: {
    media: AniListMedia[];
    pageInfo: CatalogPageInfo;
  } | null = null;
  let backupSearchAnime: Anime[] | null = null;
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
  const remoteAnime =
    backupSearchAnime ??
    remotePage?.media.map(mapAniListAnime).map(applyCanonicalTitleLocalization);
  const publicCatalog = remoteAnime?.length
    ? await enrichAnimeListWithLocalizedTitles(remoteAnime)
    : await getPublicCatalog();
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
    <AppShell className="app-shell-discovery">
      <DiscoveryPageShell
        className="catalog-page"
        hero={<CatalogHero />}
        controls={
          <CatalogControls filters={filters} resultCount={pageInfo.total} />
        }
      >
        <CatalogResults
          anime={anime}
          pageInfo={pageInfo}
          fallback={!remotePage}
          query={new URLSearchParams(
            Object.entries(raw).flatMap(([key, value]) =>
              Array.isArray(value)
                ? value.map((item) => [key, item])
                : value
                  ? [[key, value]]
                  : [],
            ),
          ).toString()}
        />
      </DiscoveryPageShell>
    </AppShell>
  );
}
