import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchPageContent } from "@/components/player/WatchPageContent";
import {
  getAnimeEpisodes,
  getEpisode,
  getPublishedEpisodeRelease,
} from "@/domain/watch";
import type { WatchEpisode } from "@/data/watch/types";
import { resolveAnimeBySlug } from "@/lib/anime/resolve";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import { getAnimeSeasonsForDetails, resolveWatchEpisode as resolveDbWatchEpisode } from "@/server/services/episode.service";

interface WatchPageProps {
  params: Promise<{ slug: string; episode: string }>;
  searchParams?: Promise<{ season?: string }>;
}

function resolveKodikEmbedUrl(embedUrl?: string | null) {
  if (process.env.KODIK_PROVIDER_ENABLED !== "true") return undefined;
  return embedUrl?.trim() || undefined;
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
    const currentSeason = seasons.find((item) => item.seasonNumber === seasonNumber);
    const episodes = currentSeason?.episodes.map((item) => item.metadata) ?? [];
    const kodikEmbedUrl = resolveKodikEmbedUrl(resolved.kodikPlayback?.embedUrl);
    const availability = kodikEmbedUrl
      ? ("AVAILABLE" as const)
      : resolved.availability;
    return {
      anime,
      episode,
      available: availability === "AVAILABLE",
      availability,
      episodes,
      episodeAvailability: {
        ...Object.fromEntries((currentSeason?.episodes ?? []).map((item) => [item.id, item.availability])),
        [resolved.metadata.id]: availability,
      },
      availableAt: resolved.metadata.availableAt,
      kodikPlayback:
        process.env.KODIK_PROVIDER_ENABLED === "false"
          ? null
          : resolved.kodikPlayback,
      kodikEmbedUrl,
      previousHref: resolved.previous
        ? `/watch/${anime.slug}/${resolved.previous.number}?season=${seasonNumber}`
        : undefined,
      nextHref: resolved.next
        ? `/watch/${anime.slug}/${resolved.next.number}?season=${seasonNumber}`
        : undefined,
    };
  } catch {
    if (slug !== "eclipse-protocol") return null;
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
  const kodikEmbedUrl = resolveKodikEmbedUrl();
  const availability = kodikEmbedUrl
    ? ("AVAILABLE" as const)
    : release
      ? ("AVAILABLE" as const)
      : ("NO_VIDEO" as const);
  return {
    anime,
    episode,
    available: availability === "AVAILABLE",
    availability,
    episodes,
    episodeAvailability: Object.fromEntries(episodes.map((item) => [
      item.id,
      item.episodeNumber === episodeNumber && kodikEmbedUrl
        ? "AVAILABLE"
        : getPublishedEpisodeRelease(slug, item.seasonNumber, item.episodeNumber)
          ? "AVAILABLE"
          : "NO_VIDEO",
    ])) as Record<string, import("@/domain/watch").EpisodeAvailability>,
    availableAt: metadata.availableAt,
    kodikPlayback: null,
    kodikEmbedUrl,
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
  const result = await resolveWatchPage(params, searchParams);
  if (!result) notFound();
  const { anime, episode, available, episodes, episodeAvailability, availableAt, kodikEmbedUrl, previousHref, nextHref } =
    result;
  return (
    <WatchPageContent
      anime={anime}
      episode={episode}
      episodes={episodes}
      previousHref={previousHref}
      nextHref={nextHref}
      available={available}
      availability={result.availability}
      availableAt={availableAt}
      episodeAvailability={episodeAvailability}
      seasonNumber={Number((await searchParams)?.season ?? 1)}
      kodikEmbedUrl={kodikEmbedUrl}
    />
  );
}
