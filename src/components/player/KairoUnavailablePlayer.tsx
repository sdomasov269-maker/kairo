"use client";

import { Maximize, Pause, Play, Settings, VolumeX } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/i18n";
import type { EpisodeAvailability } from "@/domain/watch";

export function KairoUnavailablePlayer({
  animeSlug,
  nextHref,
  availability,
  availableAt,
}: {
  animeSlug: string;
  nextHref?: string;
  availability: EpisodeAvailability;
  availableAt?: string;
}) {
  const { dictionary: t } = useLocale();
  return (
    <section
      aria-label={t.player.videoUnavailable}
      aria-live="polite"
      className="kairo-player unavailable-player"
    >
      <div className="unavailable-player-message">
        <span>KAIRO</span>
        <h2>
          {availability === "COMING_SOON"
            ? t.catalog.episodesNotReleased
            : t.player.videoUnavailable}
        </h2>
        <p>
          {availability === "COMING_SOON" && availableAt
            ? new Intl.DateTimeFormat(undefined, {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(availableAt))
            : t.player.videoUnavailableDescription}
        </p>
        <div>
          <Link
            className="button button-primary"
            href={`/anime/${animeSlug}#episodes`}
          >
            {t.player.backToEpisodes}
          </Link>
          {nextHref && (
            <Link className="button button-secondary" href={nextHref}>
              {t.player.nextEpisode}
            </Link>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="player-controls controls-disabled">
        <div className="timeline-wrap">
          <input
            aria-disabled="true"
            aria-label={t.labels.progress}
            disabled
            max={100}
            min={0}
            type="range"
            value={0}
          />
        </div>
        <div className="controls-row">
          <button disabled>
            <Play />
          </button>
          <button disabled>
            <Pause />
          </button>
          <button disabled>
            <VolumeX />
          </button>
          <div className="controls-spacer" />
          <button disabled>
            <Settings />
          </button>
          <button disabled>
            <Maximize />
          </button>
        </div>
      </div>
    </section>
  );
}
