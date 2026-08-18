import "server-only";

import { getAiringScheduleRange, mapAniListAnime } from "@/lib/anilist";
import { prisma } from "@/lib/db/prisma";
import type { ReleaseScheduleResult } from "@/lib/release-schedule/types";
import { unifiedWatchUrl } from "@/lib/watch-route";
import { mapAnimeRecord } from "@/server/repositories/anime.repository";
export type {
  ReleaseScheduleItem,
  ReleaseScheduleResult,
} from "@/lib/release-schedule/types";

export const utcDateKey = (date: Date) => date.toISOString().slice(0, 10);

export function startOfUtcWeek(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
}

export async function getReleaseSchedule(
  start: Date,
  days = 7,
): Promise<ReleaseScheduleResult> {
  const rangeStart = new Date(start);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + Math.min(Math.max(days, 1), 14));
  const [providerSchedule, episodeRecords] = await Promise.all([
    getAiringScheduleRange(rangeStart, rangeEnd)
      .then((items) => ({ items, available: true }))
      .catch(() => ({ items: [], available: false })),
    prisma.animeEpisode
      .findMany({
        where: {
          OR: [
            { airDate: { gte: rangeStart, lt: rangeEnd } },
            { airDate: null, availableAt: { gte: rangeStart, lt: rangeEnd } },
          ],
        },
        include: {
          anime: true,
          season: { select: { number: true } },
          videoSources: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: [{ airDate: "asc" }, { availableAt: "asc" }],
      })
      .then((items) => ({ items, available: true }))
      .catch(() => ({ items: [], available: false })),
  ]);
  const localItems = episodeRecords.items.flatMap((episode) => {
    const releasedAt = episode.airDate ?? episode.availableAt;
    return releasedAt
      ? [
          {
            anime: mapAnimeRecord(episode.anime),
            episode: episode.number,
            airingAt: Math.floor(releasedAt.getTime() / 1000),
            href:
              episode.isPublished && episode.videoSources.length
                ? unifiedWatchUrl(
                    episode.anime.slug,
                    episode.season.number,
                    episode.number,
                  )
                : `/anime/${episode.anime.slug}`,
          },
        ]
      : [];
  });
  const localByIdentity = new Map(
    localItems.map((item) => [
      `${item.anime.anilistId ?? item.anime.slug}:${item.episode}`,
      item,
    ]),
  );
  const providerItems = providerSchedule.items.flatMap((entry) => {
    if (!entry.media) return [];
    const anime = mapAniListAnime(entry.media);
    const local = localByIdentity.get(`${entry.media.id}:${entry.episode}`);
    return [
      {
        anime,
        episode: entry.episode,
        airingAt: entry.airingAt,
        href: local?.href ?? `/anime/${anime.slug}`,
      },
    ];
  });
  const providerIdentities = new Set(
    providerItems.map(
      (item) => `${item.anime.anilistId ?? item.anime.slug}:${item.episode}`,
    ),
  );
  const items = [
    ...new Map(
      [
        ...providerItems,
        ...localItems.filter(
          (item) =>
            !providerIdentities.has(
              `${item.anime.anilistId ?? item.anime.slug}:${item.episode}`,
            ),
        ),
      ].map((item) => [
        `${item.anime.anilistId ?? item.anime.slug}:${item.episode}`,
        item,
      ]),
    ).values(),
  ].sort((a, b) => a.airingAt - b.airingAt);
  return {
    items,
    available: providerSchedule.available || episodeRecords.available,
    start: utcDateKey(rangeStart),
    end: utcDateKey(rangeEnd),
  };
}
