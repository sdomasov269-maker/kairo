import { NextResponse } from "next/server";
import { parseCatalogParams } from "@/lib/catalog";
import { normalizeAnimeTitle } from "@/lib/catalog/identity";
import { getPublicCatalog } from "@/lib/catalog/public";
import {
  AniListRequestError,
  mapAniListAnime,
  searchAnimeCatalog,
} from "@/lib/anilist";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import { getJikanAnimeBySearch, mapJikanAnime } from "@/lib/jikan";
import { enrichAnimeListWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const filters = parseCatalogParams(Object.fromEntries(query.entries()));
  try {
    const remote = await searchAnimeCatalog(filters);
    if (!remote)
      throw new AniListRequestError("Catalog unavailable", 503, true);
    const anime = await enrichAnimeListWithLocalizedTitles(
      remote.media.map(mapAniListAnime).map(applyCanonicalTitleLocalization),
    );
    return NextResponse.json({
      anime,
      pageInfo: remote.pageInfo,
      fallback: false,
    });
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    const source = filters.search
      ? await getJikanAnimeBySearch(filters.search)
      : null;
    const catalog =
      source?.ok && source.data
        ? await enrichAnimeListWithLocalizedTitles([
            applyCanonicalTitleLocalization(mapJikanAnime(source.data)),
          ])
        : await getPublicCatalog();
    const normalized = filters.search
      ? normalizeAnimeTitle(filters.search)
      : undefined;
    const filtered = catalog.filter(
      (item) =>
        (!normalized ||
          [
            item.title,
            item.titleRu,
            item.titleUk,
            item.titleEnglish,
            item.titleNative,
            item.titleRomaji,
            ...(item.synonyms ?? []),
          ].some(
            (title) => title && normalizeAnimeTitle(title).includes(normalized),
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
    const start = (filters.page - 1) * filters.perPage;
    return NextResponse.json({
      anime: filtered.slice(start, start + filters.perPage),
      pageInfo: {
        currentPage: filters.page,
        lastPage: Math.max(1, Math.ceil(filtered.length / filters.perPage)),
        hasNextPage: start + filters.perPage < filtered.length,
        total: filtered.length,
      },
      fallback: true,
    });
  }
}
