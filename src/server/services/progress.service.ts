import "server-only";
import { prisma } from "@/lib/db";
import type { z } from "zod";
import { progressInput } from "@/server/validation/data";
type Input = z.infer<typeof progressInput>;
const dto = (item: {
  animeKey: string;
  seasonNumber: number;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  percent: number;
  completed: boolean;
  updatedAt: Date;
}) => ({ ...item, updatedAt: item.updatedAt.toISOString() });
export const getProgress = (userId: string) =>
  prisma.watchProgress
    .findMany({ where: { userId }, orderBy: { updatedAt: "desc" } })
    .then((items) => items.map(dto));
export async function upsertProgress(userId: string, input: Input) {
  const percent =
    input.duration > 0
      ? Math.min(100, Math.max(0, (input.currentTime / input.duration) * 100))
      : 0;
  return dto(
    await prisma.watchProgress.upsert({
      where: {
        userId_animeKey_seasonNumber_episodeNumber: {
          userId,
          animeKey: input.animeKey,
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
        },
      },
      create: { userId, ...input, percent, completed: percent >= 95 },
      update: {
        currentTime: input.currentTime,
        duration: input.duration,
        percent,
        completed: percent >= 95,
      },
    }),
  );
}
export const clearProgress = (userId: string) =>
  prisma.watchProgress.deleteMany({ where: { userId } });
export const deleteProgress = (
  userId: string,
  animeKey: string,
  seasonNumber: number,
  episodeNumber: number,
) =>
  prisma.watchProgress.deleteMany({
    where: { userId, animeKey, seasonNumber, episodeNumber },
  });
