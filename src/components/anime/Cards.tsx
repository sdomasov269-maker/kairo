"use client";

import { Check, Plus, Play, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import Link from "next/link";
import type { Anime, WatchingProgress } from "@/types/media";
import { AnimePoster } from "./AnimePoster";
import { useLocale } from "@/i18n";
import { OverflowMarqueeText } from "@/components/ui/OverflowMarqueeText";
import { KairoDomCurlTarget } from "@/components/effects/KairoDomCurlTarget";
import {
  formatScore,
  getLocalizedAnimeTitle,
  localizeGenre,
  localizeStatus,
} from "@/lib/media-localization";

export function AnimeCard({
  anime,
  index,
  compactHover = false,
}: {
  anime: Anime;
  index: number;
  compactHover?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const reduced = useReducedMotion();
  const { locale, dictionary: t } = useLocale();
  const title =
    anime.displayTitleLocale === locale && anime.displayTitle
      ? anime.displayTitle
      : getLocalizedAnimeTitle(anime, locale);
  const status = localizeStatus(anime.status, locale);
  const genres = anime.genres.map((genre) => localizeGenre(genre, locale));
  return (
    <motion.article
      className="anime-card"
      data-card-index={index}
      whileHover={reduced ? undefined : { y: compactHover ? -3 : -7 }}
      transition={{ duration: 0.3 }}
    >
      <div className="poster-shell">
        <Link
          href={`/anime/${anime.slug}`}
          aria-label={`${t.actions.details}: ${title}`}
          className="poster-link"
        >
          <AnimePoster
            anime={anime}
            sizes="(max-width: 500px) 45vw, (max-width: 1100px) 30vw, 15vw"
          />
        </Link>
        <button
          onClick={() => setSaved(!saved)}
          className="save-button"
          aria-label={`${saved ? t.actions.remove : t.actions.add}: ${title}`}
        >
          {saved ? <Check size={17} /> : <Plus size={17} />}
        </button>
        <span className={`status status-${anime.status.toLowerCase()}`}>
          {status}
        </span>
      </div>
      <KairoDomCurlTarget className="card-copy" kind="text">
        <div className="card-title-row">
          <h3>
            <Link
              href={`/anime/${anime.slug}`}
              aria-label={`${t.actions.details}: ${title}`}
              title={title}
            >
              {title}
            </Link>
          </h3>
          {anime.rating && (
            <span
              className="card-rating"
              aria-label={`${t.labels.rating}: ${formatScore(anime.rating, locale)}`}
            >
              <Star size={12} fill="currentColor" />
              {formatScore(anime.rating, locale)}
            </span>
          )}
        </div>
        <div className="card-meta-row">
          <p title={genres.join(" · ")}>{genres.slice(0, 2).join(" · ")}</p>
          <span className="card-year">{anime.year}</span>
        </div>
      </KairoDomCurlTarget>
    </motion.article>
  );
}

export function ContinueWatchingCard({ item }: { item: WatchingProgress }) {
  const { dictionary: t } = useLocale();
  return (
    <article className="watch-card">
      <div className={`watch-thumb art-${item.art}`}>
        <div className="poster-mark" />
        <button
          className="round-play"
          aria-label={`${t.actions.watch}: ${item.title}`}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <KairoDomCurlTarget className="watch-copy" kind="text">
        <div className="watch-title">
          <p>
            {t.labels.episode} {item.episode}
          </p>
          <h3>
            <OverflowMarqueeText text={item.title} />
          </h3>
        </div>
        <span>
          {t.labels.remaining}: {item.remaining}
        </span>
      </KairoDomCurlTarget>
      <div className="progress" aria-label={`${item.progress}%`}>
        <i style={{ width: `${item.progress}%` }} />
      </div>
    </article>
  );
}
