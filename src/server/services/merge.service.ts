import "server-only";
import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { mergeLocalDataInput } from "@/server/validation/merge";
type Input = z.infer<typeof mergeLocalDataInput>;
type Counts = {
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
};
const key = (x: Input["progress"][number]) =>
  `${x.animeKey}:${x.seasonNumber}:${x.episodeNumber}`;
const percent = (current: number, duration: number) =>
  duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
const dedupe = <T>(
  items: T[],
  getKey: (item: T) => string,
  getDate: (item: T) => string,
) => [
  ...items
    .reduce((map, item) => {
      const old = map.get(getKey(item));
      if (!old || Date.parse(getDate(item)) >= Date.parse(getDate(old)))
        map.set(getKey(item), item);
      return map;
    }, new Map<string, T>())
    .values(),
];
const preferenceDto = (x: {
  locale: string;
  autoplayNext: boolean;
  playbackRate: number;
  subtitleLanguage: string | null;
  subtitlesEnabled: boolean;
  subtitleSize: string;
  subtitleBackground: string;
  preferredAudioLanguage: string | null;
  preferredQualityMode: string;
  reducedEffectsPreference: string;
  updatedAt: Date;
}) => ({
  ...x,
  preferredQualityMode: Number.isFinite(Number(x.preferredQualityMode))
    ? Number(x.preferredQualityMode)
    : "auto",
  updatedAt: x.updatedAt.toISOString(),
});

export async function mergeLocalData(userId: string, input: Input) {
  const progress = dedupe(input.progress, key, (x) => x.updatedAt);
  const animeList = dedupe(
    input.animeList,
    (x) => x.animeKey,
    (x) => x.updatedAt,
  );
  return prisma.$transaction(
    async (tx) => {
      const progressCounts: Counts = {
        created: 0,
        updated: 0,
        unchanged: 0,
        rejected: 0,
      };
      for (const item of progress) {
        if (item.duration > 0 && item.currentTime > item.duration + 300) {
          progressCounts.rejected++;
          continue;
        }
        const where = {
          userId_animeKey_seasonNumber_episodeNumber: {
            userId,
            animeKey: item.animeKey,
            seasonNumber: item.seasonNumber,
            episodeNumber: item.episodeNumber,
          },
        };
        const existing = await tx.watchProgress.findUnique({ where });
        const localPercent = percent(item.currentTime, item.duration);
        const localCompleted = localPercent >= 95;
        if (!existing) {
          await tx.watchProgress.create({
            data: {
              userId,
              animeKey: item.animeKey,
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              currentTime: item.currentTime,
              duration: item.duration,
              percent: localPercent,
              completed: localCompleted,
              updatedAt: new Date(item.updatedAt),
            },
          });
          progressCounts.created++;
        } else if (
          (existing.completed && !localCompleted) ||
          existing.updatedAt.getTime() > Date.parse(item.updatedAt)
        ) {
          progressCounts.unchanged++;
        } else {
          await tx.watchProgress.update({
            where,
            data: {
              currentTime: item.currentTime,
              duration: item.duration,
              percent: localPercent,
              completed: existing.completed || localCompleted,
              updatedAt: new Date(item.updatedAt),
            },
          });
          progressCounts.updated++;
        }
      }
      const listCounts: Counts = {
        created: 0,
        updated: 0,
        unchanged: 0,
        rejected: 0,
      };
      for (const item of animeList) {
        const where = { userId_animeKey: { userId, animeKey: item.animeKey } };
        const existing = await tx.animeListEntry.findUnique({ where });
        if (!existing) {
          await tx.animeListEntry.create({
            data: {
              userId,
              animeKey: item.animeKey,
              status: item.status,
              addedAt: item.addedAt
                ? new Date(item.addedAt)
                : new Date(item.updatedAt),
              updatedAt: new Date(item.updatedAt),
            },
          });
          listCounts.created++;
        } else if (existing.updatedAt.getTime() > Date.parse(item.updatedAt))
          listCounts.unchanged++;
        else {
          await tx.animeListEntry.update({
            where,
            data: { status: item.status, updatedAt: new Date(item.updatedAt) },
          });
          listCounts.updated++;
        }
      }
      const preferences =
        input.preferencesStrategy === "local" && input.preferences
          ? await tx.userPreferences.upsert({
              where: { userId },
              create: {
                userId,
                ...input.preferences,
                preferredQualityMode: String(
                  input.preferences.preferredQualityMode,
                ),
              },
              update: {
                ...input.preferences,
                preferredQualityMode: String(
                  input.preferences.preferredQualityMode,
                ),
              },
            })
          : await tx.userPreferences.upsert({
              where: { userId },
              create: { userId },
              update: {},
            });
      return {
        progress: progressCounts,
        animeList: listCounts,
        preferences: preferenceDto(preferences),
      };
    },
    { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel },
  );
}
