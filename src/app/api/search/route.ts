import { NextResponse } from "next/server";
import { normalizeAnimeTitle } from "@/lib/catalog/identity";
import {
  AniListRequestError,
  mapAniListAnime,
  searchAnimeCatalog,
} from "@/lib/anilist";
import { applyCanonicalTitleLocalization } from "@/lib/media-localization";
import { getJikanAnimeBySearch, mapJikanAnime } from "@/lib/jikan";
import { enrichAnimeListWithLocalizedTitles } from "@/server/services/anime-title-enrichment.service";
import { findAniListIdsByLocalizedQuery } from "@/server/repositories/anime-title.repository";
import { findAnimeByAniListIds } from "@/server/repositories/anime.repository";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
    .get("q")
    ?.trim()
    .slice(0, 100);
  if (!query || query.length < 2) return NextResponse.json({ results: [] });
  let localResults: Awaited<ReturnType<typeof findAnimeByAniListIds>> = [];
  try {
    const localIds = await findAniListIdsByLocalizedQuery(query, 12);
    localResults = await enrichAnimeListWithLocalizedTitles(await findAnimeByAniListIds(localIds));
  } catch {
    // The public search remains available before/while the localization migration is deployed.
  }
  let page: Awaited<ReturnType<typeof searchAnimeCatalog>>;
  try {
    page = await searchAnimeCatalog({
      search: query,
      page: 1,
      perPage: 6,
      genres: [],
      sort: "POPULARITY_DESC",
    });
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    const backup = await getJikanAnimeBySearch(query);
    if (backup.ok && backup.data) {
      return NextResponse.json({
        results: localResults.length ? localResults.slice(0, 6) : await enrichAnimeListWithLocalizedTitles([applyCanonicalTitleLocalization(mapJikanAnime(backup.data))]),
        source: "backup",
      });
    }
    if (localResults.length) {
      return NextResponse.json({ results: localResults.slice(0, 6), source: "local" });
    }
    return NextResponse.json(
      { error: "AniList is temporarily unavailable", results: [] },
      { status: 503 },
    );
  }
  const normalizedQuery = normalizeAnimeTitle(query);
  const enriched = await enrichAnimeListWithLocalizedTitles((page?.media ?? [])
    .map(mapAniListAnime)
    .map(applyCanonicalTitleLocalization));
  const curatedRemote = enriched
    .filter((anime) =>
      [
        anime.title,
        anime.titleRu,
        anime.titleUk,
        anime.titleEnglish,
        anime.titleNative,
        anime.titleRomaji,
        ...(anime.localization?.ru?.synonyms ?? []),
        ...(anime.localization?.uk?.synonyms ?? []),
        ...(anime.synonyms ?? []),
      ].some(
        (title) =>
          title && normalizeAnimeTitle(title).includes(normalizedQuery),
      ),
    );
  const curated = [...localResults, ...curatedRemote];
  return NextResponse.json({
    results: [...new Map(curated.map((anime) => [anime.anilistId ?? anime.slug, anime])).values()].slice(0, 6),
  });
}
