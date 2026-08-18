import { PrismaClient, type Anime, type Prisma } from "@prisma/client";
import { mergeAnimeIndexRecord } from "../../lib/anime-index/normalize.ts";
import type { AnimeIndexRecord } from "../../lib/anime-index/types.ts";

const prisma = new PrismaClient();
export type AnimeIndexWriteMode = "only-missing" | "update-existing";

const createData = (record: AnimeIndexRecord): Prisma.AnimeCreateInput => ({
  anilistId: record.anilistId,
  malId: record.malId,
  slug: record.slug,
  titleRomaji: record.titles.romaji,
  titleEnglish: record.titles.english,
  titleNative: record.titles.native,
  synonyms: record.synonyms,
  format: record.format,
  status: record.status,
  season: record.season,
  year: record.seasonYear,
  episodes: record.episodes,
  duration: record.duration,
  coverImage: record.coverImage,
  coverImageLarge: record.coverImageLarge,
  bannerImage: record.bannerImage,
  descriptionEnglish: record.description,
  genres: record.genres,
  studios: record.studios,
  rating: record.averageScore,
  popularity: record.popularity,
});

async function writeOne(
  tx: Prisma.TransactionClient,
  record: AnimeIndexRecord,
  mode: AnimeIndexWriteMode,
) {
  const existing = await tx.anime.findUnique({
    where: { anilistId: record.anilistId },
  });
  if (!existing) {
    await tx.anime.create({ data: createData(record) });
    return "created" as const;
  }
  if (mode === "only-missing") return "skipped" as const;
  await tx.anime.update({
    where: { anilistId: record.anilistId },
    data: mergeAnimeIndexRecord(existing, record) as Prisma.AnimeUpdateInput,
  });
  return "updated" as const;
}

export async function upsertAnimeIndexRecord(
  record: AnimeIndexRecord,
  mode: AnimeIndexWriteMode = "only-missing",
) {
  return prisma.$transaction((tx) => writeOne(tx, record, mode));
}

export async function upsertAnimeIndexBatch(
  records: AnimeIndexRecord[],
  mode: AnimeIndexWriteMode = "only-missing",
) {
  return prisma.$transaction(async (tx) => {
    const results: Array<"created" | "updated" | "skipped"> = [];
    for (const record of records)
      results.push(await writeOne(tx, record, mode));
    return results;
  });
}

export async function getIndexedAniListIds(ids?: number[]) {
  const records = await prisma.anime.findMany({
    where: ids ? { anilistId: { in: ids } } : undefined,
    select: { anilistId: true },
  });
  return new Set(records.map((record) => record.anilistId));
}

export async function getExistingAnimeMap(ids: number[]) {
  const records = await prisma.anime.findMany({
    where: { anilistId: { in: [...new Set(ids)] } },
  });
  return new Map(records.map((record) => [record.anilistId, record]));
}

export const countIndexedAnime = () => prisma.anime.count();
export const findAnimeByAniListId = (anilistId: number) =>
  prisma.anime.findUnique({ where: { anilistId } });
export const findAnimeBySlug = (slug: string) =>
  prisma.anime.findUnique({ where: { slug } });
export const disconnectAnimeIndexRepository = () => prisma.$disconnect();

export function analyzeAnimeIndexChanges(
  existing: Anime | null,
  record: AnimeIndexRecord,
  mode: AnimeIndexWriteMode,
) {
  if (!existing) return "new" as const;
  return mode === "update-existing" ? ("update" as const) : ("skip" as const);
}
