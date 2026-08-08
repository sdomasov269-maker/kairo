"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KairoUnavailablePlayer } from "./KairoUnavailablePlayer";
import { useLocale } from "@/i18n";
import type { WatchEpisode } from "@/data/watch/types";
import type { EpisodeMetadata } from "@/domain/watch/types";
import type { Anime } from "@/types/media";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import type { EpisodeAvailability } from "@/domain/watch";
import { KodikWatchPlayer } from "./kodik/KodikWatchPlayer";
import type { KodikWatchPlaybackDto } from "./kodik/kodik-watch.types";

export function WatchPageContent({
  anime,
  episode,
  episodes,
  nextHref,
  available,
  availability,
  availableAt,
  episodeAvailability,
  seasonNumber,
  kodikPlayback,
}: {
  anime: Anime;
  episode: WatchEpisode;
  episodes: EpisodeMetadata[];
  nextHref?: string;
  available: boolean;
  availability: EpisodeAvailability;
  availableAt?: string;
  episodeAvailability: Record<string, EpisodeAvailability>;
  seasonNumber: number;
  kodikPlayback?: KodikWatchPlaybackDto | null;
}) {
  const { locale, dictionary: t } = useLocale();
  const animeTitle = getLocalizedAnimeTitle(anime, locale);
  const episodeTitle = locale === "ru" ? episode.titleRu : episode.titleEn;
  const description =
    locale === "ru" ? episode.descriptionRu : episode.descriptionEn;

  return (
    <main className="watch-page">
      <header className="watch-header">
        <Link href={`/anime/${anime.slug}`}>
          <ArrowLeft size={17} />
          <span>{t.player.backToAnime}</span>
        </Link>
        <Link className="logo" href="/">
          kairo<span>.</span>
        </Link>
        <span>{t.player.demoVideo}</span>
      </header>
      <section className="watch-stage">
        <div className="watch-title">
          <p>{animeTitle}</p>
          <h1>
            {t.labels.episode} {episode.episodeNumber} · {episodeTitle}
          </h1>
        </div>
        {available && kodikPlayback ? (
          <KodikWatchPlayer
            playback={kodikPlayback}
            animeSlug={anime.slug}
            seasonNumber={seasonNumber}
            episodeNumber={episode.episodeNumber}
            title={`${animeTitle} — ${episodeTitle}`}
          />
        ) : (
          <KairoUnavailablePlayer
            animeSlug={anime.slug}
            nextHref={nextHref}
            availability={availability}
            availableAt={availableAt}
          />
        )}
      </section>
      <section className="watch-information">
        <div>
          <p className="eyebrow">{t.player.demoVideo}</p>
          <h2>{episodeTitle}</h2>
          {description && <p>{description}</p>}
        </div>
        <nav aria-label={t.player.episodeList}>
          {episodes.map((item) => {
            const title =
              item.text[locale]?.title ??
              item.text.en.title ??
              `${t.labels.episode} ${item.episodeNumber}`;
            const active = item.episodeNumber === episode.episodeNumber;
            const href = `/watch/${anime.slug}/${item.episodeNumber}?season=${seasonNumber}`;
            const content = (
              <>
                <span>{String(item.episodeNumber).padStart(2, "0")}</span>
                <strong>{title}</strong>
              </>
            );
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`${active ? "active" : ""} ${episodeAvailability[item.id] === "AVAILABLE" ? "" : "watch-episode-unavailable"}`.trim()}
                href={href}
                key={item.id}
              >
                {content}
                {episodeAvailability[item.id] !== "AVAILABLE" && (
                  <small>
                    {episodeAvailability[item.id] === "COMING_SOON"
                      ? t.catalog.episodesNotReleased
                      : t.player.videoUnavailable}
                  </small>
                )}
              </Link>
            );
          })}
        </nav>
      </section>
      <footer className="watch-footer">
        <p>{t.player.demoNotice}</p>
        <Link href={`/anime/${anime.slug}`}>{t.player.backToAnime}</Link>
      </footer>
    </main>
  );
}
