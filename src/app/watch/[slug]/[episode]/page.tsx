import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAnimeEpisodes,
  getEpisode,
  getPublishedEpisodeRelease,
} from "@/domain/watch";
import type { WatchEpisode } from "@/data/watch/types";
import { resolveAnimeBySlug } from "@/lib/anime/resolve";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import {
  getAnimeSeasonsForDetails,
  resolveWatchEpisode as resolveDbWatchEpisode,
  WatchResolveError,
} from "@/server/services/episode.service";
import { resolveKodikWatchPlayback } from "@/server/services/kodik-watch.service";
import { resolveKodikRuntimeWatchEpisode } from "@/server/services/kodik/runtime-watch";
import { unifiedWatchUrl } from "@/lib/watch-route";

interface WatchPageProps {
  params: Promise<{ slug: string; episode: string }>;
  searchParams?: Promise<{ season?: string }>;
}

async function resolveWatchPage(
  params: WatchPageProps["params"],
  searchParams?: WatchPageProps["searchParams"],
) {
  const { slug, episode: rawEpisode } = await params;
  const rawSeason = (await searchParams)?.season ?? "1";
  if (!/^\d{1,3}$/.test(rawSeason)) return null;
  const seasonNumber = Number(rawSeason);
  if (!/^\d{1,5}$/.test(rawEpisode)) return null;
  const episodeNumber = Number(rawEpisode);
  if (
    !Number.isInteger(episodeNumber) ||
    episodeNumber < 1 ||
    episodeNumber > 10000
  )
    return null;
  const anime = await resolveAnimeBySlug(slug);
  if (!anime) return null;
  try {
    const resolved = await resolveDbWatchEpisode({
      slug: anime.slug,
      seasonNumber,
      episodeNumber,
    });
    const episode: WatchEpisode = {
      animeSlug: anime.slug,
      episodeNumber,
      titleRu:
        resolved.episode.titleRu ??
        resolved.episode.title ??
        `Серия ${episodeNumber}`,
      titleEn: resolved.episode.title ?? `Episode ${episodeNumber}`,
      descriptionRu: resolved.episode.description ?? "",
      descriptionEn: resolved.episode.description ?? "",
      duration: resolved.episode.durationSec ?? undefined,
      sources: resolved.sources,
      subtitles: resolved.subtitles.map((track) => ({
        ...track,
        language: track.language as "ru" | "en" | "ja",
      })),
      audioTracks: [],
      chapters: [
        {
          id: `${resolved.episode.id}-intro`,
          type: "intro" as const,
          title: "Intro",
          startTime: resolved.episode.introStartSec ?? 0,
          endTime: resolved.episode.introEndSec ?? 0,
        },
      ].filter((chapter) => chapter.endTime > chapter.startTime),
    };
    const seasons = await getAnimeSeasonsForDetails(anime.slug);
    const currentSeason = seasons.find(
      (item) => item.seasonNumber === seasonNumber,
    );
    const episodes = currentSeason?.episodes.map((item) => item.metadata) ?? [];
    const kodikPlayback = resolved.kodikPlayback;
    const availability = kodikPlayback
      ? ("AVAILABLE" as const)
      : resolved.availability;
    return {
      anime,
      episode,
      available: availability === "AVAILABLE",
      availability,
      episodes,
      episodeAvailability: {
        ...Object.fromEntries(
          (currentSeason?.episodes ?? []).map((item) => [
            item.id,
            item.availability,
          ]),
        ),
        [resolved.metadata.id]: availability,
      },
      availableAt: resolved.metadata.availableAt,
      kodikPlayback,
      previousHref: resolved.previous
        ? `/watch/${anime.slug}/${resolved.previous.number}?season=${seasonNumber}`
        : undefined,
      nextHref: resolved.next
        ? `/watch/${anime.slug}/${resolved.next.number}?season=${seasonNumber}`
        : undefined,
    };
  } catch (error) {
    if (!(error instanceof WatchResolveError)) throw error;
    if (
      error.code !== "ANIME_NOT_FOUND" &&
      error.code !== "SEASON_NOT_FOUND" &&
      error.code !== "EPISODE_NOT_FOUND"
    )
      return null;

    const { episode, kodikPlayback } = await resolveKodikRuntimeWatchEpisode(
      anime,
      seasonNumber,
      episodeNumber,
      resolveKodikWatchPlayback,
    );
    if (slug !== "eclipse-protocol" || kodikPlayback) {
      const availability = kodikPlayback
        ? ("AVAILABLE" as const)
        : ("NO_VIDEO" as const);
      return {
        anime,
        episode,
        available: Boolean(kodikPlayback),
        availability,
        episodes: [],
        episodeAvailability: {},
        availableAt: undefined,
        kodikPlayback,
        previousHref: undefined,
        nextHref: undefined,
      };
    }
  }
  const metadata = getEpisode(slug, seasonNumber, episodeNumber);
  const release = getPublishedEpisodeRelease(slug, seasonNumber, episodeNumber);
  if (!metadata) return null;
  const episode: WatchEpisode = {
    animeSlug: metadata.animeSlug,
    episodeNumber: metadata.episodeNumber,
    titleRu: metadata.text.ru.title ?? `Серия ${metadata.episodeNumber}`,
    titleEn: metadata.text.en.title ?? `Episode ${metadata.episodeNumber}`,
    descriptionRu: metadata.text.ru.synopsis ?? "",
    descriptionEn: metadata.text.en.synopsis ?? "",
    duration: metadata.duration,
    sources: (release?.sources ?? []).map((s) => ({
      id: s.id,
      type: s.kind,
      url: s.url,
      label: s.label,
      isDemo: s.isDemo,
    })),
    subtitles: (release?.subtitles ?? []).map((s) => ({
      ...s,
      kind: "subtitles" as const,
    })),
    audioTracks: (release?.audioLabels ?? []).map((a) => ({
      id: a.id,
      language: a.language,
      label: a.label,
      studio: a.studio,
    })),
    chapters: (release?.chapters ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      title: c.titleRu,
      startTime: c.startTime,
      endTime: c.endTime,
    })),
  };
  const episodes = getAnimeEpisodes(anime.slug, seasonNumber);
  const currentIndex = episodes.findIndex(
    (item) => item.episodeNumber === episodeNumber,
  );
  const kodikPlayback = await resolveKodikWatchPlayback({
    ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
    ...(anime.malId ? { malId: anime.malId } : {}),
    ...(anime.year ? { year: anime.year } : {}),
    titles: {
      ...(anime.titleRu ? { russian: anime.titleRu } : {}),
      ...(anime.titleEnglish ? { english: anime.titleEnglish } : {}),
      ...(anime.titleRomaji ? { romaji: anime.titleRomaji } : {}),
      ...(anime.titleNative ? { native: anime.titleNative } : {}),
      aliases: anime.synonyms ?? [],
    },
    seasonNumber,
    episodeNumber,
  });
  const availability = kodikPlayback
    ? ("AVAILABLE" as const)
    : ("NO_VIDEO" as const);
  return {
    anime,
    episode,
    available: availability === "AVAILABLE",
    availability,
    episodes,
    episodeAvailability: Object.fromEntries(
      episodes.map((item) => [
        item.id,
        item.episodeNumber === episodeNumber && kodikPlayback
          ? "AVAILABLE"
          : getPublishedEpisodeRelease(
                slug,
                item.seasonNumber,
                item.episodeNumber,
              )
            ? "AVAILABLE"
            : "NO_VIDEO",
      ]),
    ) as Record<string, import("@/domain/watch").EpisodeAvailability>,
    availableAt: metadata.availableAt,
    kodikPlayback,
    previousHref:
      currentIndex > 0
        ? `/watch/${anime.slug}/${episodes[currentIndex - 1].episodeNumber}?season=${seasonNumber}`
        : undefined,
    nextHref:
      currentIndex >= 0 && episodes[currentIndex + 1]
        ? `/watch/${anime.slug}/${episodes[currentIndex + 1].episodeNumber}?season=${seasonNumber}`
        : undefined,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: WatchPageProps): Promise<Metadata> {
  const result = await resolveWatchPage(params, searchParams);
  if (!result) return { robots: { index: false, follow: false } };
  const title = getLocalizedAnimeTitle(result.anime, "ru");
  return {
    title: `${title} — серия ${result.episode.episodeNumber} — Kairo`,
    description: "Просмотр демонстрационной серии на Kairo",
    robots: { index: false, follow: false },
    alternates: { canonical: `/anime/${result.anime.slug}` },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: WatchPageProps) {
  const { slug, episode } = await params;
  const season = (await searchParams)?.season ?? "1";
  if (!/^\d{1,5}$/.test(episode) || !/^\d{1,3}$/.test(season)) notFound();
  redirect(unifiedWatchUrl(slug, Number(season), Number(episode)));
}
