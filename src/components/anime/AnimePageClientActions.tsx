"use client";

import { Check, Plus, Play, Youtube } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useLocale } from "@/i18n";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { selectAnimeProgress } from "@/lib/watch-progress";
import type { EpisodeMetadata } from "@/domain/watch/types";

export function AnimePageClientActions({
  slug,
  trailerUrl,
  episodes,
}: {
  slug: string;
  trailerUrl?: string;
  episodes: EpisodeMetadata[];
}) {
  const { dictionary: t } = useLocale();
  const { progress, animeList, upsertList, deleteList } = useAccountData();
  const listEntry = animeList.find((item) => item.animeKey === slug);
  const animeProgress = useMemo(
    () => selectAnimeProgress(progress, slug, episodes),
    [episodes, progress, slug],
  );
  const target = animeProgress.targetEpisode;
  const watchLabel = animeProgress.allCompleted
    ? t.actions.rewatch
    : animeProgress.incomplete
      ? `${t.actions.continueEpisode} ${animeProgress.incomplete.episodeNumber}`
      : animeProgress.animeEntries.length > 0 && target
        ? `${t.actions.continueEpisode} ${target.episodeNumber}`
        : t.actions.watch;
  return (
    <div className="details-actions">
      {target ? (
        <Link
          className="button button-primary"
          href={`/anime/${slug}?season=${target.seasonNumber}&episode=${target.episodeNumber}#watch`}
        >
          <Play size={18} fill="currentColor" />
          {watchLabel}
        </Link>
      ) : (
        <a className="button button-primary" href="#watch">
          <Play size={18} fill="currentColor" />
          {t.actions.watch}
        </a>
      )}
      <button
        className="button button-secondary"
        onClick={() =>
          listEntry ? deleteList(slug) : upsertList(slug, "PLANNED")
        }
      >
        {listEntry ? <Check size={18} /> : <Plus size={18} />}
        {listEntry ? t.actions.inList : t.actions.add}
      </button>
      {trailerUrl && (
        <a
          className="button button-secondary"
          href={trailerUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Youtube size={18} />
          {t.actions.trailer}
        </a>
      )}
    </div>
  );
}
