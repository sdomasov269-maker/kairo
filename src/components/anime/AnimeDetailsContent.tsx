"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AnimeCard } from "./Cards";
import { DetailSectionHeading } from "./DetailSectionHeading";
import { useLocale } from "@/i18n";
import type { Anime } from "@/types/media";
import {
  formatDuration,
  formatEpisodeCount,
  getAlternativeTitles,
  isUpcomingStatus,
  localizeCountry,
  localizeFormat,
  localizeSeason,
  localizeSource,
  localizeStatus,
  resolveLocalizedAnimeDescription,
} from "@/lib/media-localization";
import type { EpisodeMetadata } from "@/domain/watch/types";
import type { EpisodeAvailability } from "@/domain/watch";
import { useAccountData } from "@/components/data/AccountDataProvider";
import {
  calculateWatchPercent,
  isEpisodeCompleted,
  selectAnimeProgress,
} from "@/lib/watch-progress";

const formatClock = (value: number) => {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatSafeDate = (value: string, locale: "ru" | "uk" | "en") => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat(
    locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-US",
    {
      dateStyle: "medium",
    },
  ).format(new Date(timestamp));
};

interface DetailSection {
  key: string;
  id?: string;
  title: string;
  className?: string;
  content: ReactNode;
}

export function AnimeDetailsContent({
  anime,
  related,
  episodes,
  availability,
  seasons,
}: {
  anime: Anime;
  related: Anime[];
  episodes: EpisodeMetadata[];
  availability: Record<string, EpisodeAvailability>;
  seasons: Array<{
    id: string;
    number: number;
    title?: string | null;
    titleRu?: string | null;
    titleUk?: string | null;
  }>;
}) {
  const { locale, dictionary: t } = useLocale();
  const { progress } = useAccountData();
  const [showAllTitles, setShowAllTitles] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.number ?? 1);
  const rows = useMemo(
    () =>
      [...episodes]
        .filter((episode) => episode.seasonNumber === selectedSeason)
        .sort(
          (a, b) =>
            a.seasonNumber - b.seasonNumber ||
            a.episodeNumber - b.episodeNumber,
        ),
    [episodes, selectedSeason],
  );
  const watchableRows = useMemo(
    () => rows.filter((episode) => availability[episode.id] === "AVAILABLE"),
    [availability, rows],
  );
  const animeProgress = useMemo(
    () => selectAnimeProgress(progress, anime.slug, watchableRows),
    [anime.slug, progress, watchableRows],
  );
  const progressByEpisode = useMemo(
    () =>
      new Map(
        animeProgress.animeEntries.map((entry) => [
          `${entry.seasonNumber}:${entry.episodeNumber}`,
          entry,
        ]),
      ),
    [animeProgress.animeEntries],
  );
  const description = resolveLocalizedAnimeDescription(anime, locale);
  const alternatives = getAlternativeTitles(anime, locale);
  const visibleAlternatives = showAllTitles
    ? alternatives
    : alternatives.slice(0, 5);
  const upcoming = isUpcomingStatus(anime.status);
  const airingDate = anime.nextAiringEpisode
    ? new Intl.DateTimeFormat(
        locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-US",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(new Date(anime.nextAiringEpisode.airingAt * 1000))
    : undefined;
  const info: [string, string | undefined][] = [
    [
      t.labels.originalTitle,
      anime.titleNative ?? anime.titleRomaji ?? anime.title,
    ],
    [t.labels.country, localizeCountry(anime.country, locale)],
    [t.labels.source, localizeSource(anime.source, locale)],
    [t.labels.season, localizeSeason(anime.season, locale, anime.year)],
    [t.labels.format, localizeFormat(anime.format, locale)],
    [t.labels.status, localizeStatus(anime.status, locale)],
    [t.labels.studios, anime.studios?.join(", ")],
    [t.labels.episodeCount, formatEpisodeCount(anime.episodes, locale)],
    [t.labels.duration, formatDuration(anime.duration, locale)],
  ];

  const sections: DetailSection[] = [
    ...(animeProgress.latest
      ? [
          {
            key: "progress",
            title: t.labels.progress,
            content: (
              <div className="anime-progress-card">
                <div>
                  <p>
                    {t.labels.episode} {animeProgress.latest.episodeNumber}
                  </p>
                  <strong>
                    {formatClock(animeProgress.latest.currentTime)}
                    {animeProgress.latest.duration > 0
                      ? ` / ${formatClock(animeProgress.latest.duration)}`
                      : ""}
                  </strong>
                </div>
                <div>
                  <p>{t.labels.progress}</p>
                  <strong>
                    {Math.round(
                      calculateWatchPercent(
                        animeProgress.latest.currentTime,
                        animeProgress.latest.duration,
                      ),
                    )}
                    %
                  </strong>
                </div>
                <div>
                  <p>{t.labels.lastWatched}</p>
                  <strong>
                    {formatSafeDate(animeProgress.latest.updatedAt, locale) ??
                      t.sync.unknownDate}
                  </strong>
                </div>
                {animeProgress.targetEpisode && (
                  <Link
                    className="button button-primary detail-card-action"
                    href={`/watch/${anime.slug}/${animeProgress.targetEpisode.episodeNumber}?season=${animeProgress.targetEpisode.seasonNumber}`}
                  >
                    {t.sync.continueWatching}
                  </Link>
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "episodes",
      id: "episodes",
      title: t.labels.episodes,
      content: rows.length ? (
        <div>
          {seasons.length > 1 && (
            <div
              className="episode-season-selector"
              role="tablist"
              aria-label={t.labels.season}
            >
              {seasons.map((season) => (
                <button
                  aria-selected={selectedSeason === season.number}
                  className={selectedSeason === season.number ? "active" : ""}
                  key={season.id}
                  onClick={() => setSelectedSeason(season.number)}
                  role="tab"
                >
                  {season.titleRu ??
                    season.title ??
                    `${t.labels.season} ${season.number}`}
                </button>
              ))}
            </div>
          )}
          <div className="details-episodes">
            {rows.map((episode) => {
              const state = availability[episode.id] ?? "NO_VIDEO";
              const available = state === "AVAILABLE";
              const episodeProgress = progressByEpisode.get(
                `${episode.seasonNumber}:${episode.episodeNumber}`,
              );
              const completed = episodeProgress
                ? isEpisodeCompleted(episodeProgress)
                : false;
              const started = Boolean(
                episodeProgress && episodeProgress.currentTime >= 1,
              );
              const current =
                animeProgress.incomplete?.seasonNumber ===
                  episode.seasonNumber &&
                animeProgress.incomplete?.episodeNumber ===
                  episode.episodeNumber;
              const title =
                episode.text[locale]?.title ??
                episode.text.ru.title ??
                episode.text.en.title ??
                `${t.labels.episode} ${episode.episodeNumber}`;
              const percent = episodeProgress
                ? Math.round(
                    calculateWatchPercent(
                      episodeProgress.currentTime,
                      episodeProgress.duration,
                    ),
                  )
                : 0;
              const content = (
                <>
                  <span>{String(episode.episodeNumber).padStart(2, "0")}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>
                      {episode.airDate
                        ? formatSafeDate(episode.airDate, locale)
                        : null}
                      {episode.duration
                        ? `${episode.airDate ? " · " : ""}${formatClock(episode.duration)}`
                        : null}
                    </p>
                    {episode.metadataProviders?.length ? (
                      <small>
                        {episode.metadataProviders.join(" · ")} · metadata
                      </small>
                    ) : null}
                    {started && (
                      <progress
                        aria-label={`${t.labels.progress}: ${percent}%`}
                        max={100}
                        value={percent}
                      />
                    )}
                  </div>
                  <span className="episode-state">
                    {!available
                      ? state === "COMING_SOON"
                        ? episode.availableAt
                          ? formatSafeDate(episode.availableAt, locale)
                          : "Скоро"
                        : state === "SOURCE_DISABLED"
                          ? "Источник отключён"
                          : "Видео пока не добавлено"
                      : current
                        ? t.labels.watching
                        : completed
                          ? t.labels.watched
                          : started
                            ? `${percent}%`
                            : t.labels.notStarted}
                  </span>
                </>
              );
              return available ? (
                <Link
                  aria-current={current ? "page" : undefined}
                  aria-label={`${t.actions.playEpisode}: ${title}`}
                  className={`details-episode ${available ? "" : "is-unavailable"}`}
                  href={`/watch/${anime.slug}/${episode.episodeNumber}?season=${episode.seasonNumber}`}
                  key={episode.id}
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-label={`${t.actions.playEpisode}: ${title}`}
                  className="details-episode is-unavailable"
                  key={episode.id}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="episodes-empty">
          <h3>
            {upcoming
              ? t.catalog.episodesNotReleased
              : t.catalog.episodesUnavailable}
          </h3>
          {upcoming && (
            <p>
              {airingDate
                ? `${t.labels.episode} ${anime.nextAiringEpisode?.episode}: ${airingDate}`
                : t.catalog.episodesNotReleasedHint}
            </p>
          )}
        </div>
      ),
    },
  ];

  if (description.hasFullDescription && description.full) {
    sections.push({
      key: "description",
      id: "description",
      title: t.labels.description,
      className: "description-block",
      content: <p>{description.full}</p>,
    });
  }

  sections.push({
    key: "information",
    title: t.labels.information,
    content: (
      <dl className="metadata-grid">
        {info
          .filter(([, value]) => value && value !== "—")
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        {visibleAlternatives.length > 0 && (
          <div className="alternative-titles">
            <dt>{t.labels.alternativeTitles}</dt>
            <dd>
              {visibleAlternatives.map((title) => (
                <span key={title} title={title}>
                  {title}
                </span>
              ))}
            </dd>
            {alternatives.length > 5 && (
              <button onClick={() => setShowAllTitles(!showAllTitles)}>
                {showAllTitles ? t.catalog.showLess : t.catalog.showMore}
              </button>
            )}
          </div>
        )}
      </dl>
    ),
  });

  if (related.length > 0) {
    sections.push({
      key: "related",
      title: t.labels.related,
      content: (
        <div className="anime-grid related-grid">
          {related.map((item, index) => (
            <AnimeCard anime={item} index={index} key={item.id} />
          ))}
        </div>
      ),
    });
  }

  const visibleSections = sections.filter(
    (section) => section.key !== "episodes",
  );

  return (
    <main className="anime-details-main">
      {visibleSections.map((section, index) => (
        <section
          className={`details-section ${section.className ?? ""}`}
          id={section.id}
          key={section.key}
        >
          <DetailSectionHeading number={index + 3} title={section.title} />
          {section.content}
        </section>
      ))}
    </main>
  );
}
