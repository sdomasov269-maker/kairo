import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getAnimeDiscovery, stripAniListHtml } from "@/lib/anilist";
import { anilistSlug } from "@/lib/catalog";
import { getRussianAnimeMetadataByMalId } from "@/lib/shikimori";
import { animeLocalizationOverridesRu } from "@/data/localizations/anime-overrides.ru";
import { animeLocalizationOverridesUk } from "@/data/localizations/anime-overrides.uk";

export async function importAnimePage(page = 1, perPage = 50) {
  const media = await getAnimeDiscovery({ page, perPage });
  if (!media.length) {
    throw new Error(
      "AniList returned no anime; the local catalogue was not changed.",
    );
  }

  const importOne = async (item: (typeof media)[number]) => {
    const ruManual = animeLocalizationOverridesRu[item.id];
    const ruRemote = item.idMal
      ? await getRussianAnimeMetadataByMalId(item.idMal)
      : null;
    const uk = animeLocalizationOverridesUk[item.id];
    const englishDescription = stripAniListHtml(item.description) || null;
    const title =
      item.title.english ??
      item.title.romaji ??
      item.title.native ??
      `Anime ${item.id}`;
    await prisma.anime.upsert({
      where: { anilistId: item.id },
      create: {
        anilistId: item.id,
        malId: item.idMal,
        slug: anilistSlug(item.id, title),
        titleEnglish: item.title.english,
        titleRomaji: item.title.romaji,
        titleNative: item.title.native,
        titleRussian: ruManual?.titleRu ?? ruRemote?.titleRu ?? null,
        titleUkrainian: uk?.titleUk ?? null,
        descriptionEnglish: englishDescription,
        descriptionRussian:
          ruManual?.descriptionRu ?? ruRemote?.descriptionRu ?? null,
        descriptionUkrainian: uk?.descriptionUk ?? null,
        synonyms: item.synonyms,
        synonymsRussian: ruRemote?.synonymsRu ?? [],
        synonymsUkrainian: uk?.synonymsUk ?? [],
        coverImage: item.coverImage.large,
        coverImageLarge: item.coverImage.extraLarge ?? item.coverImage.large,
        bannerImage: item.bannerImage,
        dominantColor: item.coverImage.color,
        genres: item.genres,
        year: item.seasonYear,
        season: item.season,
        format: item.format,
        status: item.status,
        episodes: item.episodes,
        duration: item.duration,
        rating: item.averageScore ?? item.meanScore,
        popularity: item.popularity,
        studios: item.studios.nodes
          .filter((s) => s.isAnimationStudio)
          .map((s) => s.name),
        country: item.countryOfOrigin,
        source: item.source,
        trailerUrl:
          item.trailer?.site === "youtube"
            ? `https://www.youtube.com/watch?v=${item.trailer.id}`
            : null,
        nextAiringAt: item.nextAiringEpisode?.airingAt,
        nextAiringEpisode: item.nextAiringEpisode?.episode,
        russianTitleSource: ruManual
          ? "manual"
          : ruRemote
            ? "shikimori"
            : "missing",
        ukrainianTitleSource: uk ? "manual" : "missing",
      },
      update: {
        malId: item.idMal,
        titleEnglish: item.title.english,
        titleRomaji: item.title.romaji,
        titleNative: item.title.native,
        titleRussian: ruManual?.titleRu ?? ruRemote?.titleRu ?? undefined,
        titleUkrainian: uk?.titleUk ?? undefined,
        descriptionEnglish: englishDescription,
        descriptionRussian:
          ruManual?.descriptionRu ?? ruRemote?.descriptionRu ?? undefined,
        descriptionUkrainian: uk?.descriptionUk ?? undefined,
        synonyms: item.synonyms,
        synonymsRussian: ruRemote?.synonymsRu ?? undefined,
        synonymsUkrainian: uk?.synonymsUk ?? undefined,
        coverImage: item.coverImage.large,
        coverImageLarge: item.coverImage.extraLarge ?? item.coverImage.large,
        bannerImage: item.bannerImage,
        dominantColor: item.coverImage.color,
        genres: item.genres,
        year: item.seasonYear,
        season: item.season,
        format: item.format,
        status: item.status,
        episodes: item.episodes,
        duration: item.duration,
        rating: item.averageScore ?? item.meanScore,
        popularity: item.popularity,
        studios: item.studios.nodes
          .filter((s) => s.isAnimationStudio)
          .map((s) => s.name),
        country: item.countryOfOrigin,
        source: item.source,
        trailerUrl:
          item.trailer?.site === "youtube"
            ? `https://www.youtube.com/watch?v=${item.trailer.id}`
            : null,
        nextAiringAt: item.nextAiringEpisode?.airingAt,
        nextAiringEpisode: item.nextAiringEpisode?.episode,
        russianTitleSource: ruManual
          ? "manual"
          : ruRemote
            ? "shikimori"
            : "missing",
        ukrainianTitleSource: uk ? "manual" : "missing",
        sourceUpdatedAt: new Date(),
      },
    });
  };

  const failures: Array<{ anilistId: number; reason: string }> = [];
  let imported = 0;
  const concurrency = 5;
  for (let offset = 0; offset < media.length; offset += concurrency) {
    const batch = media.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(batch.map(importOne));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") imported += 1;
      else
        failures.push({
          anilistId: batch[index].id,
          reason:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown import error",
        });
    });
  }
  return { imported, failed: failures.length, failures, page };
}
