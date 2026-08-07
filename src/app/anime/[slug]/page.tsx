import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimeDetailsHero } from "@/components/anime/AnimeDetailsHero";
import { AnimeDetailsContent } from "@/components/anime/AnimeDetailsContent";
import {
  AniListUnavailableState,
  type AniListFailureKind,
} from "@/components/anime/AniListUnavailableState";
import { AppShell } from "@/components/layout/AppShell";
import { getLocalAnimeBySlug } from "@/data/catalog";
import { anilistSlug } from "@/lib/catalog";
import {
  getLocalizedAnimeTitle,
  localizeGenre,
  createShortDescription,
  resolveLocalizedAnimeDescription,
} from "@/lib/media-localization";
import { resolveAnimeBySlug, resolveRelatedAnime } from "@/lib/anime/resolve";
import { getAnimeSeasonsForDetails } from "@/server/services/episode.service";
import { AniListRequestError } from "@/lib/anilist";
import type { Anime } from "@/types/media";
import { kodikService } from "@/server/services/kodik.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function failureKind(error: AniListRequestError): AniListFailureKind {
  if (error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limit";
  if (error.status !== null && error.status >= 500) return "server";
  if (/timed out/i.test(error.message)) return "timeout";
  if (error.status === null) return "network";
  return "unknown";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let anime: Anime | null;
  try {
    anime = await resolveAnimeBySlug(slug);
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    return {
      title: "AniList временно недоступен — Kairo",
      robots: { index: false, follow: false },
    };
  }
  if (!anime) return {};
  const title = `${getLocalizedAnimeTitle(anime, "ru")} — Kairo`;
  const localizedDescription = resolveLocalizedAnimeDescription(anime, "ru");
  const description =
    createShortDescription(
      localizedDescription.short ?? localizedDescription.full,
      165,
    ) ?? "Аниме в каталоге Kairo.";
  const image = anime.bannerImage ?? anime.coverImageLarge;
  return {
    title,
    description,
    alternates: {
      canonical: `/anime/${anime.anilistId && !getLocalAnimeBySlug(slug) ? anilistSlug(anime.anilistId, anime.title) : slug}`,
    },
    openGraph: {
      title,
      description,
      type: "video.tv_show",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function AnimePage({ params }: PageProps) {
  const { slug } = await params;
  let anime: Anime | null;
  try {
    anime = await resolveAnimeBySlug(slug);
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    return (
      <AppShell className="app-shell-detail">
        <AniListUnavailableState kind={failureKind(error)} />
      </AppShell>
    );
  }
  if (!anime) notFound();
  const related = await resolveRelatedAnime(anime);
  const seasonDetails = await getAnimeSeasonsForDetails(anime.slug);
  const kodikEpisodes = anime.malId ? await kodikService.getAvailableEpisodeKeys(anime.malId) : new Set<string>();
  for (const season of seasonDetails) {
    for (const episode of season.episodes) {
      if (episode.availability === "NO_VIDEO" && kodikEpisodes.has(`${season.seasonNumber}:${episode.episodeNumber}`)) {
        episode.availability = "AVAILABLE";
        episode.watchHref = `/watch/${anime.slug}/${episode.episodeNumber}?season=${season.seasonNumber}`;
      }
    }
  }
  const episodes = seasonDetails.flatMap((season) => season.episodes.map((episode) => episode.metadata));
  const availability = Object.fromEntries(
    seasonDetails.flatMap((season) => season.episodes.map((episode) => [episode.id, episode.availability])),
  );
  const watchableEpisodes = episodes.filter(
    (episode) => availability[episode.id] === "AVAILABLE",
  );
  const pageDescription = resolveLocalizedAnimeDescription(anime, "ru");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": anime.format === "MOVIE" ? "Movie" : "TVSeries",
    name: getLocalizedAnimeTitle(anime, "ru"),
    alternateName: [anime.titleRomaji, anime.titleNative].filter(Boolean),
    description: pageDescription.full ?? pageDescription.short ?? undefined,
    image: anime.coverImageLarge,
    numberOfEpisodes: anime.episodes,
    genre: anime.genres.map((genre) => localizeGenre(genre, "ru")),
  };
  return (
    <AppShell className="app-shell-detail">
      <AnimeDetailsHero anime={anime} episodes={watchableEpisodes} />
      <AnimeDetailsContent
        anime={anime}
        related={related}
        episodes={episodes}
        availability={availability}
        seasons={seasonDetails.map((season) => ({ id: season.id, number: season.seasonNumber, title: season.title }))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </AppShell>
  );
}
