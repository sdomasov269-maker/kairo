import "server-only";
import type {
  AnimeEpisode,
  AnimeSeason,
  AnimeSubtitleTrack,
  AnimeVideoSource,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getAnimeEpisodes as getDemoEpisodes,
  getPublishedEpisodeRelease,
} from "@/domain/watch/resolvers";
import {
  getEpisodeAvailability,
  resolveEpisodeTitle,
  type EpisodeAvailability,
  type EpisodeMetadata,
} from "@/domain/watch";

type EpisodeRow = AnimeEpisode & {
  videoSources: AnimeVideoSource[];
  subtitleTracks: AnimeSubtitleTrack[];
  providerReferences?: Array<{ provider: { name: string } }>;
};
type SeasonRow = AnimeSeason & { episodes: EpisodeRow[] };

const toMetadata = (
  slug: string,
  season: AnimeSeason,
  episode: AnimeEpisode,
  metadataProviders?: string[],
): EpisodeMetadata => ({
  id: episode.id,
  animeSlug: slug,
  seasonNumber: season.number,
  episodeNumber: episode.number,
  anilistEpisodeNumber: episode.absoluteNumber ?? undefined,
  airDate: episode.airDate?.toISOString(),
  availableAt: episode.availableAt?.toISOString(),
  duration: episode.durationSec ?? undefined,
  thumbnail: episode.thumbnailUrl ?? undefined,
  metadataProviders,
  text: {
    ru: {
      title: resolveEpisodeTitle({
        locale: "ru",
        episodeNumber: episode.number,
        title: episode.title,
        titleRu: episode.titleRu,
        titleUk: episode.titleUk,
      }),
      synopsis: episode.description ?? undefined,
    },
    uk: {
      title: resolveEpisodeTitle({
        locale: "uk",
        episodeNumber: episode.number,
        title: episode.title,
        titleRu: episode.titleRu,
        titleUk: episode.titleUk,
      }),
      synopsis: episode.description ?? undefined,
    },
    en: {
      title: resolveEpisodeTitle({
        locale: "en",
        episodeNumber: episode.number,
        title: episode.title,
        titleRu: episode.titleRu,
        titleUk: episode.titleUk,
      }),
      synopsis: episode.description ?? undefined,
    },
  },
});

const loadDatabaseEpisodes = (slug: string) =>
  prisma.anime.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      format: true,
      animeSeasons: {
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" as const }, { number: "asc" as const }],
        include: {
          episodes: {
            orderBy: { number: "asc" as const },
            include: {
              videoSources: true,
              subtitleTracks: true,
              providerReferences: {
                include: { provider: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

export async function getAnimeEpisodesBySlug(slug: string) {
  let anime: Awaited<ReturnType<typeof loadDatabaseEpisodes>> = null;
  try {
    anime = await loadDatabaseEpisodes(slug);
  } catch {
    // Keep the compatibility catalog available while an episode migration is pending.
  }
  if (!anime?.animeSeasons.length) {
    const episodes = getDemoEpisodes(slug);
    return {
      seasons: episodes.length
        ? [
            {
              id: `${slug}-demo-season-1`,
              number: 1,
              title: null,
              titleRu: null,
              titleUk: null,
            },
          ]
        : [],
      episodes,
      animeFormat: null as string | null,
      availability: Object.fromEntries(
        episodes.map((episode) => [
          episode.id,
          getPublishedEpisodeRelease(
            slug,
            episode.seasonNumber,
            episode.episodeNumber,
          )
            ? "AVAILABLE"
            : "NO_VIDEO",
        ]),
      ) as Record<string, EpisodeAvailability>,
    };
  }
  const seasons = anime.animeSeasons as SeasonRow[];
  return {
    seasons: seasons.map(({ id, number, title, titleRu, titleUk }) => ({
      id,
      number,
      title,
      titleRu,
      titleUk,
    })),
    episodes: seasons.flatMap((season) =>
      season.episodes.map((episode) =>
        toMetadata(slug, season, episode, [
          ...new Set(
            (episode.providerReferences ?? []).map(
              (reference) => reference.provider.name,
            ),
          ),
        ]),
      ),
    ),
    animeFormat: anime.format,
    availability: Object.fromEntries(
      seasons.flatMap((season) =>
        season.episodes.map((episode) => [
          episode.id,
          getEpisodeAvailability(episode),
        ]),
      ),
    ) as Record<string, EpisodeAvailability>,
  };
}

export type AnimeEpisodeDetails = {
  id: string;
  episodeNumber: number;
  absoluteNumber: number | null;
  type: "REGULAR" | "MOVIE" | "OVA" | "ONA" | "SPECIAL" | "RECAP";
  metadata: EpisodeMetadata;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  airedAt: string | null;
  availableAt: string | null;
  availability: EpisodeAvailability;
  watchHref: string | null;
};

export type AnimeSeasonDetails = {
  id: string;
  seasonNumber: number;
  title: string | null;
  isPublished: true;
  episodes: AnimeEpisodeDetails[];
};

export async function getAnimeSeasonsForDetails(
  slug: string,
): Promise<AnimeSeasonDetails[]> {
  const catalog = await getAnimeEpisodesBySlug(slug);
  return catalog.seasons.map((season) => ({
    id: season.id,
    seasonNumber: season.number,
    title: season.titleRu ?? season.titleUk ?? season.title ?? null,
    isPublished: true as const,
    episodes: catalog.episodes
      .filter((episode) => episode.seasonNumber === season.number)
      .sort((left, right) => left.episodeNumber - right.episodeNumber)
      .map((episode) => {
        const availability = catalog.availability[episode.id] ?? "NO_VIDEO";
        return {
          id: episode.id,
          episodeNumber: episode.episodeNumber,
          absoluteNumber: episode.anilistEpisodeNumber ?? null,
          type: (catalog.animeFormat === "MOVIE"
            ? "MOVIE"
            : catalog.animeFormat === "OVA"
              ? "OVA"
              : catalog.animeFormat === "ONA"
                ? "ONA"
                : catalog.animeFormat === "SPECIAL"
                  ? "SPECIAL"
                  : "REGULAR") as AnimeEpisodeDetails["type"],
          metadata: episode,
          description:
            episode.text.ru.synopsis ?? episode.text.en.synopsis ?? null,
          thumbnailUrl: episode.thumbnail ?? null,
          durationSeconds: episode.duration ?? null,
          airedAt: episode.airDate ?? null,
          availableAt: episode.availableAt ?? null,
          availability,
          watchHref: `/watch/${slug}/${episode.episodeNumber}?season=${season.number}`,
        };
      }),
  }));
}
