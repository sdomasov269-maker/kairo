import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Anime } from "@/types/media";

type AnimeRecord = {
  id: string;
  slug: string;
  anilistId: number;
  malId: number | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  titleRussian: string | null;
  titleUkrainian: string | null;
  descriptionEnglish: string | null;
  descriptionRussian: string | null;
  descriptionUkrainian: string | null;
  synonyms: string[];
  synonymsRussian: string[];
  synonymsUkrainian: string[];
  coverImage: string | null;
  coverImageLarge: string | null;
  bannerImage: string | null;
  dominantColor: string | null;
  genres: string[];
  year: number | null;
  season: string | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  rating: number | null;
  popularity: number | null;
  studios: string[];
  country: string | null;
  source: string | null;
  trailerUrl: string | null;
  nextAiringAt: number | null;
  nextAiringEpisode: number | null;
  russianTitleSource: string | null;
  ukrainianTitleSource: string | null;
};

export function mapAnimeRecord(record: AnimeRecord): Anime {
  const title =
    record.titleEnglish ??
    record.titleRomaji ??
    record.titleNative ??
    `Anime ${record.anilistId}`;
  return {
    id: record.id,
    slug: record.slug,
    anilistId: record.anilistId,
    malId: record.malId ?? undefined,
    title,
    titleEnglish: record.titleEnglish ?? undefined,
    titleRomaji: record.titleRomaji ?? undefined,
    titleNative: record.titleNative ?? undefined,
    titleRu: record.titleRussian ?? undefined,
    titleUk: record.titleUkrainian ?? undefined,
    tagline: "",
    description: record.descriptionEnglish ?? "",
    descriptionEn: record.descriptionEnglish ?? undefined,
    descriptionRu: record.descriptionRussian ?? undefined,
    descriptionUk: record.descriptionUkrainian ?? undefined,
    synopsis: record.descriptionEnglish ?? "",
    synonyms: record.synonyms,
    coverImage: record.coverImage ?? undefined,
    coverImageLarge: record.coverImageLarge ?? undefined,
    bannerImage: record.bannerImage ?? undefined,
    dominantColor: record.dominantColor ?? undefined,
    genres: record.genres,
    year: record.year ?? undefined,
    season: record.season ?? undefined,
    format: record.format ?? undefined,
    status: record.status ?? "",
    episodes: record.episodes ?? undefined,
    duration: record.duration ?? undefined,
    rating: record.rating ?? undefined,
    popularity: record.popularity ?? undefined,
    studios: record.studios,
    country: record.country ?? undefined,
    source: record.source ?? undefined,
    trailerUrl: record.trailerUrl ?? undefined,
    nextAiringEpisode:
      record.nextAiringAt && record.nextAiringEpisode
        ? { airingAt: record.nextAiringAt, episode: record.nextAiringEpisode }
        : undefined,
    localization: {
      ru: {
        title: record.titleRussian ?? undefined,
        description: record.descriptionRussian ?? undefined,
        synonyms: record.synonymsRussian,
        source:
          (record.russianTitleSource as
            "manual" | "shikimori" | "anilist-fallback" | "missing") ??
          "missing",
      },
      uk: {
        title: record.titleUkrainian ?? undefined,
        description: record.descriptionUkrainian ?? undefined,
        synonyms: record.synonymsUkrainian,
        source:
          (record.ukrainianTitleSource as "manual" | "fallback" | "missing") ??
          "missing",
      },
    },
    art: "eclipse",
  };
}

export async function findAnimeBySlug(slug: string) {
  const record = await prisma.anime.findUnique({ where: { slug } });
  return record ? mapAnimeRecord(record) : null;
}

export async function findAnimeByAniListId(anilistId: number) {
  const record = await prisma.anime.findUnique({ where: { anilistId } });
  return record ? mapAnimeRecord(record) : null;
}

export async function listAnime() {
  return (
    await prisma.anime.findMany({
      orderBy: [{ popularity: "desc" }, { year: "desc" }],
    })
  ).map(mapAnimeRecord);
}

export async function findAnimeByCalendarSeasonPage(
  season: string,
  year: number,
  skip = 0,
  take = 50,
) {
  const where = { season, year };
  const [total, records] = await prisma.$transaction([
    prisma.anime.count({ where }),
    prisma.anime.findMany({
      where,
      orderBy: [{ popularity: "desc" }, { rating: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
  ]);
  return { total, anime: records.map(mapAnimeRecord) };
}

export async function findAnimeByAniListIds(anilistIds: number[]) {
  if (!anilistIds.length) return [];
  const records = await prisma.anime.findMany({
    where: { anilistId: { in: anilistIds } },
  });
  const order = new Map(anilistIds.map((id, index) => [id, index]));
  return records
    .sort(
      (a, b) => (order.get(a.anilistId) ?? 0) - (order.get(b.anilistId) ?? 0),
    )
    .map(mapAnimeRecord);
}

export async function findRelatedAnime(anime: Anime, take = 6) {
  const records = await prisma.anime.findMany({
    where: {
      id: { not: anime.id },
      genres: anime.genres.length ? { hasSome: anime.genres } : undefined,
    },
    orderBy: [{ popularity: "desc" }],
    take,
  });
  return records.map(mapAnimeRecord);
}
