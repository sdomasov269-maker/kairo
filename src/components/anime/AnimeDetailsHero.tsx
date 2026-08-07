"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AnimePoster } from "./AnimePoster";
import { AnimePageClientActions } from "./AnimePageClientActions";
import { useLocale } from "@/i18n";
import type { Anime } from "@/types/media";
import {
  formatScore,
  getLocalizedAnimeTitle,
  resolveAnimeOriginalTitle,
  hasRussianAnimeDescription,
  resolveLocalizedAnimeDescription,
  localizeFormat,
  localizeGenre,
  localizeStatus,
} from "@/lib/media-localization";
import type { EpisodeMetadata } from "@/domain/watch/types";

export function AnimeDetailsHero({
  anime,
  episodes,
}: {
  anime: Anime;
  episodes: EpisodeMetadata[];
}) {
  const reduced = useReducedMotion();
  const { locale, dictionary: t } = useLocale();
  const title = getLocalizedAnimeTitle(anime, locale);
  const originalTitle = resolveAnimeOriginalTitle(anime, locale);
  const description = resolveLocalizedAnimeDescription(anime, locale);
  return (
    <section
      className="details-hero"
      style={
        {
          "--anime-color": anime.dominantColor ?? "#587b79",
        } as React.CSSProperties
      }
    >
      {anime.bannerImage && (
        <Image
          src={anime.bannerImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="details-banner"
        />
      )}
      <div className="details-backdrop" aria-hidden="true" />
      <motion.div
        className="details-hero-inner"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          {t.actions.back}
        </Link>
        <div className="details-layout">
          <AnimePoster
            anime={anime}
            priority
            sizes="(max-width: 700px) 46vw, 280px"
            className="details-poster"
          />
          <div className="details-copy">
            <p className="eyebrow">
              {anime.isDemo ? t.hero.original : t.catalog.anilistData}
            </p>
            <h1>{title}</h1>
            <div className="original-titles">
              {originalTitle && <p>{originalTitle}</p>}
            </div>
            <div className="details-facts">
              {anime.rating && (
                <span className="rating">
                  <Star size={14} fill="currentColor" />
                  {formatScore(anime.rating, locale)}{" "}
                  <small>{t.labels.externalRating}</small>
                </span>
              )}
              {anime.year && <span>{anime.year}</span>}
              {anime.format && (
                <span>{localizeFormat(anime.format, locale)}</span>
              )}
              {anime.status && (
                <span>{localizeStatus(anime.status, locale)}</span>
              )}
            </div>
            <div className="genre-list">
              {anime.genres.map((genre) => (
                <span key={genre}>{localizeGenre(genre, locale)}</span>
              ))}
            </div>
            {description.short && (
              <p className="details-description">{description.short}</p>
            )}
            {locale === "ru" && !hasRussianAnimeDescription(anime) && (
              <p className="translation-fallback-note">
                {t.catalog.russianDescriptionMissing}
              </p>
            )}
            {description.hasFullDescription && (
              <a className="read-description-link" href="#description">
                {t.catalog.readFullDescription}
              </a>
            )}
            <AnimePageClientActions
              slug={anime.slug}
              trailerUrl={anime.trailerUrl}
              episodes={episodes}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
