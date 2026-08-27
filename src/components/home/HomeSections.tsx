"use client";

import { ArrowRight, CalendarDays, Play, RotateCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AnimeCard } from "@/components/anime/Cards";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { KairoDomCurlTarget } from "@/components/effects/KairoDomCurlTarget";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { useLocale } from "@/i18n";
import {
  getLocalizedAnimeTitle,
  localizeSeason,
} from "@/lib/media-localization";
import { formatReleaseSectionTitle } from "@/lib/release-schedule/labels";
import { selectContinueWatching } from "@/lib/watch-progress";
import { unifiedWatchUrl } from "@/lib/watch-route";
import type { Anime } from "@/types/media";
import type { CurrentSeasonResult } from "@/server/services/current-season.service";
import {
  RELEASE_SCHEDULE_TIME_ZONE,
  type ReleaseScheduleItem,
  type ReleaseScheduleResult,
} from "@/lib/release-schedule/types";
import { ReleaseCalendarModal } from "./ReleaseCalendarModal";
import { ContinueWatchingHistoryModal } from "./ContinueWatchingHistoryModal";
import styles from "./HomeSections.module.css";

function SectionHeader({
  id,
  title,
  subtitle,
  action,
  href,
  onAction,
  actionRef,
  actionDisabled = false,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: string;
  href?: string;
  onAction?: () => void;
  actionRef?: React.Ref<HTMLButtonElement>;
  actionDisabled?: boolean;
}) {
  return (
    <header className={styles.sectionHeader}>
      <div>
        <h2 id={id}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && href && (
        <Link className={styles.sectionAction} href={href}>
          {action}
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      )}
      {action && onAction && (
        <button
          className={`${styles.sectionAction} ${actionDisabled ? styles.sectionActionDisabled : ""}`}
          type="button"
          onClick={onAction}
          ref={actionRef}
          disabled={actionDisabled}
        >
          {action}
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      )}
    </header>
  );
}

function HomePopularSection({ anime }: { anime: Anime[] }) {
  const { dictionary: t } = useLocale();
  return (
    <section
      className={`${styles.section} ${styles.popular}`}
      aria-labelledby="home-popular-title"
    >
      <SectionHeader
        id="home-popular-title"
        title={t.sections.popular}
        subtitle={t.sections.popularDescription}
        action={t.sections.allTitles}
        href="/catalog"
      />
      <KairoWebGLSurface className={styles.posterGrid}>
        {anime.slice(0, 6).map((item, index) => (
          <AnimeCard anime={item} index={index} compactHover key={item.id} />
        ))}
      </KairoWebGLSurface>
    </section>
  );
}

function EmptySlot({ loading = false }: { loading?: boolean }) {
  return (
    <div
      className={`${styles.emptySlot} ${loading ? styles.skeletonSlot : ""}`}
      aria-hidden="true"
    >
      <span className={styles.placeholderOrbit} />
      {!loading && <i className={styles.placeholderPlay} />}
    </div>
  );
}

function HomeContinueWatchingSection({ anime }: { anime: Anime[] }) {
  const { locale, dictionary: t } = useLocale();
  const { mode, progress, syncStatus, refresh } = useAccountData();
  const loading = syncStatus === "idle" || syncStatus === "loading";
  const failed = syncStatus === "error" || syncStatus === "session-expired";
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyButton = useRef<HTMLButtonElement>(null);
  const catalogBySlug = new Map(anime.map((item) => [item.slug, item]));
  const unfinishedItems =
    mode.kind === "account"
      ? selectContinueWatching(progress, progress.length)
      : [];
  const items = unfinishedItems
    .flatMap((entry) => {
      const item = catalogBySlug.get(entry.animeSlug);
      return item ? [{ entry, item }] : [];
    })
    .slice(0, 3);
  const hasExtendedHistory = !loading && !failed && unfinishedItems.length > 3;
  const placeholders = Math.max(0, 3 - items.length);
  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    window.setTimeout(() => historyButton.current?.focus(), 0);
  }, []);

  return (
    <section
      className={`${styles.section} ${styles.continueSection}`}
      aria-labelledby="home-continue-title"
      data-testid="continue-watching"
      data-progress-mode={mode.kind}
      data-progress-count={progress.length}
      data-item-count={items.length}
    >
      <SectionHeader
        id="home-continue-title"
        title={t.sections.continueWatching}
        action={t.sections.history}
        onAction={() => hasExtendedHistory && setHistoryOpen(true)}
        actionRef={historyButton}
        actionDisabled={!hasExtendedHistory}
      />
      {!loading && !failed && items.length === 0 && (
        <p className={styles.continueHint}>{t.sections.emptyContinueHint}</p>
      )}
      <KairoWebGLSurface className={styles.continueGrid}>
        {loading ? (
          Array.from({ length: 3 }, (_, index) => (
            <EmptySlot loading key={index} />
          ))
        ) : failed ? (
          <div className={styles.statePanel}>
            <p>{t.sections.homeDataError}</p>
            <button type="button" onClick={() => void refresh()}>
              <RotateCw size={14} />
              {t.player.retry}
            </button>
          </div>
        ) : (
          <>
            {items.map(({ entry, item }) => {
              const title = getLocalizedAnimeTitle(item, locale);
              const remaining =
                entry.duration > entry.currentTime
                  ? Math.ceil((entry.duration - entry.currentTime) / 60)
                  : null;
              const percent = Math.max(0, Math.min(100, entry.percent));
              return (
                <Link
                  key={`${item.slug}-${entry.seasonNumber}-${entry.episodeNumber}`}
                  className={styles.realWatchCard}
                  href={unifiedWatchUrl(
                    item.slug,
                    entry.seasonNumber,
                    entry.episodeNumber,
                  )}
                >
                  <div className={styles.watchArtwork}>
                    <AnimePoster
                      anime={item}
                      sizes="(max-width: 767px) 78vw, 22vw"
                    />
                    <span className={styles.watchPlay}>
                      <Play size={18} fill="currentColor" />
                    </span>
                  </div>
                  <KairoDomCurlTarget className={styles.watchCopy} kind="text">
                    <div>
                      <p>
                        {t.labels.season} {entry.seasonNumber} ·{" "}
                        {t.labels.episode} {entry.episodeNumber}
                      </p>
                      <h3>{title}</h3>
                    </div>
                    {remaining !== null && (
                      <span>
                        {t.labels.remaining}: {remaining} {t.labels.minutes}
                      </span>
                    )}
                  </KairoDomCurlTarget>
                  <span
                    className={styles.progressTrack}
                    aria-label={`${Math.round(percent)}%`}
                  >
                    <i style={{ width: `${percent}%` }} />
                  </span>
                </Link>
              );
            })}
            {Array.from({ length: placeholders }, (_, index) => (
              <EmptySlot key={index} />
            ))}
          </>
        )}
      </KairoWebGLSurface>
      {historyOpen && hasExtendedHistory && (
        <ContinueWatchingHistoryModal
          anime={anime}
          items={unfinishedItems}
          onClose={closeHistory}
          open
        />
      )}
    </section>
  );
}

function HomeUpcomingSection({
  releases,
  schedule,
  releaseDay,
}: {
  releases: ReleaseScheduleItem[];
  schedule: ReleaseScheduleResult;
  releaseDay: { date: string; referenceDate: string } | null;
}) {
  const { locale, dictionary: t } = useLocale();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarButton = useRef<HTMLButtonElement>(null);
  const closeCalendar = useCallback(() => {
    setCalendarOpen(false);
    window.setTimeout(() => calendarButton.current?.focus(), 0);
  }, []);
  const sectionTitle = releaseDay
    ? formatReleaseSectionTitle({
        selectedDate: releaseDay.date,
        referenceDate: releaseDay.referenceDate,
        locale,
        labels: {
          today: t.sections.todayReleases,
          tomorrow: t.sections.tomorrowReleases,
          upcoming: t.sections.releasesOn,
          yesterday: t.sections.yesterdayReleases,
          past: t.sections.airedOn,
        },
      })
    : t.sections.nearestReleases;
  return (
    <section
      className={`${styles.section} ${styles.upcoming}`}
      aria-labelledby="home-upcoming-title"
    >
      <SectionHeader
        id="home-upcoming-title"
        title={sectionTitle}
        action={t.sections.calendar}
        onAction={() => setCalendarOpen(true)}
        actionRef={calendarButton}
      />
      <div className={styles.upcomingList}>
        {!schedule.available ? (
          <div className={styles.statePanel}>
            <p>{t.sections.homeScheduleError}</p>
            <button type="button" onClick={() => window.location.reload()}>
              <RotateCw size={14} />
              {t.player.retry}
            </button>
          </div>
        ) : releases.length === 0 ? (
          <div className={styles.releaseEmpty}>
            <div className={styles.releaseEmptyArt} aria-hidden="true">
              <span className={styles.emptyOrbit} />
              <span className={styles.emptyMoon} />
              <CalendarDays size={17} />
            </div>
            <div className={styles.releaseEmptyCopy}>
              <h3>{t.sections.noNearestReleases}</h3>
              <p>{t.sections.emptyReleaseHint}</p>
            </div>
          </div>
        ) : (
          releases.map((release) => {
            const item = release.anime;
            const date = new Date(release.airingAt * 1000);
            return (
              <Link
                className={styles.upcomingRow}
                href={release.href ?? `/anime/${item.slug}`}
                key={item.id}
              >
                <div className={styles.upcomingArt}>
                  <AnimePoster anime={item} sizes="45px" />
                </div>
                <KairoDomCurlTarget className={styles.upcomingCopy} kind="text">
                  <h3>{getLocalizedAnimeTitle(item, locale)}</h3>
                  <p>
                    {t.labels.episode} {release.episode}
                  </p>
                </KairoDomCurlTarget>
                <time dateTime={date.toISOString()}>
                  {new Intl.DateTimeFormat(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: RELEASE_SCHEDULE_TIME_ZONE,
                  }).format(date)}
                </time>
                <span className={styles.rowPlay} aria-hidden="true">
                  <Play size={12} fill="currentColor" />
                </span>
              </Link>
            );
          })
        )}
      </div>
      <div className={styles.calendarMark} aria-hidden="true">
        <CalendarDays size={16} />
      </div>
      {calendarOpen && (
        <ReleaseCalendarModal
          open
          onClose={closeCalendar}
          initialSchedule={schedule}
        />
      )}
    </section>
  );
}

function HomeCurrentSeasonSection({
  currentSeason,
}: {
  currentSeason: CurrentSeasonResult;
}) {
  const { locale, dictionary: t } = useLocale();
  const catalogHref = `/catalog?season=${currentSeason.season}&year=${currentSeason.year}`;
  return (
    <section
      className={`${styles.section} ${styles.currentSeason}`}
      aria-labelledby="home-current-season-title"
    >
      <SectionHeader
        id="home-current-season-title"
        title={t.sections.currentSeasonAnime}
        subtitle={localizeSeason(
          currentSeason.season,
          locale,
          currentSeason.year,
        )}
        action={t.sections.allTitles}
        href={catalogHref}
      />
      {currentSeason.status === "loading" ? (
        <div className={`${styles.posterGrid} ${styles.currentSeasonGrid}`}>
          {Array.from({ length: 24 }, (_, index) => (
            <div className={styles.seasonSkeleton} key={index} />
          ))}
        </div>
      ) : currentSeason.status === "error" ? (
        <div className={styles.seasonState} role="status">
          <p>{t.sections.currentSeasonError}</p>
        </div>
      ) : currentSeason.status === "empty" ? (
        <div className={styles.seasonState} role="status">
          <span className={styles.placeholderOrbit} aria-hidden="true" />
          <p>{t.sections.currentSeasonEmpty}</p>
        </div>
      ) : (
        <KairoWebGLSurface
          className={`${styles.posterGrid} ${styles.currentSeasonGrid}`}
        >
          {currentSeason.anime.map((item, index) => (
            <AnimeCard anime={item} index={index} compactHover key={item.id} />
          ))}
        </KairoWebGLSurface>
      )}
    </section>
  );
}

export function HomeSections({
  anime,
  currentSeason,
  releases,
  schedule,
  releaseDay,
}: {
  anime: Anime[];
  currentSeason: CurrentSeasonResult;
  releases: ReleaseScheduleItem[];
  schedule: ReleaseScheduleResult;
  releaseDay: { date: string; referenceDate: string } | null;
}) {
  return (
    <div className={styles.content}>
      <HomePopularSection anime={anime} />
      <div className={styles.secondaryGrid}>
        <HomeContinueWatchingSection anime={anime} />
        <HomeUpcomingSection
          releases={releases}
          releaseDay={releaseDay}
          schedule={schedule}
        />
      </div>
      <HomeCurrentSeasonSection
        currentSeason={currentSeason}
        key={`${currentSeason.season}-${currentSeason.year}`}
      />
    </div>
  );
}
