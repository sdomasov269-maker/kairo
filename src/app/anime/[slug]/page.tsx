import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimeDetailsHero } from "@/components/anime/AnimeDetailsHero";
import { AnimeDetailsContent } from "@/components/anime/AnimeDetailsContent";
import { KairoWatchWorkspace } from "@/components/anime/KairoWatchWorkspace";
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
import { AniListRequestError } from "@/lib/anilist";
import type { Anime } from "@/types/media";
import { getKodikAnimeWorkspace } from "@/server/services/kodik-detail.service";
import styles from "@/components/anime/AnimeDetailsLayout.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ season?: string; episode?: string; room?: string }>;
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

export default async function AnimePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  let anime: Anime | null;
  try {
    anime = await resolveAnimeBySlug(slug);
  } catch (error) {
    if (!(error instanceof AniListRequestError)) throw error;
    return (
      <AppShell className={`app-shell-detail ${styles.detailPage}`}>
        <AniListUnavailableState kind={failureKind(error)} />
      </AppShell>
    );
  }
  if (!anime) notFound();
  const related = await resolveRelatedAnime(anime);
  const { seasons: seasonDetails, workspace } =
    await getKodikAnimeWorkspace(anime);
  const query = await searchParams;
  const initialSeason = /^\d{1,3}$/.test(query?.season ?? "")
    ? Number(query?.season)
    : undefined;
  const initialEpisode = /^\d{1,5}$/.test(query?.episode ?? "")
    ? Number(query?.episode)
    : undefined;
  const episodes = seasonDetails.flatMap((season) =>
    season.episodes.map((episode) => episode.metadata),
  );
  const availability = Object.fromEntries(
    seasonDetails.flatMap((season) =>
      season.episodes.map((episode) => [episode.id, episode.availability]),
    ),
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
    <AppShell className={`app-shell-detail ${styles.detailPage}`}>
      <AnimeDetailsHero anime={anime} episodes={watchableEpisodes} />
      <KairoWatchWorkspace
        animeId={anime.id}
        animeSlug={anime.slug}
        animeTitle={getLocalizedAnimeTitle(anime, "ru")}
        data={workspace}
        initialSeason={initialSeason}
        initialEpisode={initialEpisode}
        initialRoomCode={
          /^[A-Za-z2-9]{6}$/.test(query?.room ?? "")
            ? query!.room!.toUpperCase()
            : undefined
        }
      />
      <AnimeDetailsContent
        anime={anime}
        related={related}
        episodes={episodes}
        availability={availability}
        seasons={seasonDetails.map((season) => ({
          id: season.id,
          number: season.seasonNumber,
          title: season.title,
        }))}
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
