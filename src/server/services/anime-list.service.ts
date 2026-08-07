import "server-only";
import { prisma } from "@/lib/db";
import type { AnimeListStatus } from "@prisma/client";
const dto = (item: {
  animeKey: string;
  status: AnimeListStatus;
  addedAt: Date;
  updatedAt: Date;
}) => ({
  animeKey: item.animeKey,
  status: item.status,
  addedAt: item.addedAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});
export const getAnimeList = (userId: string) =>
  prisma.animeListEntry
    .findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })
    .then((items) => items.map(dto));
export const upsertAnimeList = (
  userId: string,
  animeKey: string,
  status: AnimeListStatus,
) =>
  prisma.animeListEntry
    .upsert({
      where: { userId_animeKey: { userId, animeKey } },
      create: { userId, animeKey, status },
      update: { status },
    })
    .then(dto);
export const deleteAnimeList = (userId: string, animeKey: string) =>
  prisma.animeListEntry.deleteMany({ where: { userId, animeKey } });
export const clearAnimeList = (userId: string) =>
  prisma.animeListEntry.deleteMany({ where: { userId } });
