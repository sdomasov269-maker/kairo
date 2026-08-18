"use client";

import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { useLocale } from "@/i18n";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import { formatReleaseSectionTitle } from "@/lib/release-schedule/labels";
import {
  RELEASE_SCHEDULE_TIME_ZONE,
  type ReleaseScheduleResult,
} from "@/lib/release-schedule/types";
import styles from "./ReleaseCalendarModal.module.css";

const cache = new Map<string, ReleaseScheduleResult>();
const key = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const findCachedRange = (start: Date) => {
  const requestedStart = start.getTime();
  const requestedEnd = addDays(start, 7).getTime();
  return [...cache.values()].find((entry) => {
    const entryStart = new Date(`${entry.start}T00:00:00Z`).getTime();
    const entryEnd = new Date(`${entry.end}T00:00:00Z`).getTime();
    return entryStart <= requestedStart && entryEnd >= requestedEnd;
  });
};

export function ReleaseCalendarModal({
  open,
  onClose,
  initialSchedule,
}: {
  open: boolean;
  onClose: () => void;
  initialSchedule: ReleaseScheduleResult;
}) {
  const { locale, dictionary: t } = useLocale();
  const [weekStart, setWeekStart] = useState(
    () => new Date(`${initialSchedule.start}T00:00:00Z`),
  );
  const [selected, setSelected] = useState(() => key(new Date()));
  const [schedule, setSchedule] = useState(initialSchedule);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const [requestVersion, setRequestVersion] = useState(0);
  const [openedAt] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const releases = schedule.items.filter(
    (item) => key(new Date(item.airingAt * 1000)) === selected,
  );

  useEffect(() => {
    cache.set(initialSchedule.start, initialSchedule);
  }, [initialSchedule]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  useEffect(() => {
    const start = key(weekStart);
    const cached = findCachedRange(weekStart);
    if (cached) return;
    const controller = new AbortController();
    fetch(`/api/release-schedule?start=${start}&v=2`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as {
          data?: ReleaseScheduleResult;
          ok?: boolean;
        } & ReleaseScheduleResult;
        return body.data ?? body;
      })
      .then((result) => {
        cache.set(start, result);
        setSchedule(result);
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [requestVersion, weekStart]);

  if (!open || typeof document === "undefined") return null;
  const selectedDate = new Date(`${selected}T00:00:00Z`);
  const today = key(new Date());
  const selectedContext = formatReleaseSectionTitle({
    selectedDate: selected,
    referenceDate: today,
    locale,
    labels: {
      today: t.sections.todayReleases,
      tomorrow: t.sections.tomorrowReleases,
      upcoming: t.sections.releasesOn,
      yesterday: t.sections.yesterdayReleases,
      past: t.sections.airedOn,
    },
  });
  const navigateWeek = (offset: number) => {
    const next = addDays(weekStart, offset);
    const cached = findCachedRange(next);
    setSelected(key(next));
    setWeekStart(next);
    if (cached) {
      setSchedule(cached);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
  };
  const retry = () => {
    cache.delete(key(weekStart));
    setStatus("loading");
    setRequestVersion((value) => value + 1);
  };
  const selectAdjacentDay = (day: Date, offset: number) => {
    const next = addDays(day, offset);
    const first = days[0].getTime();
    const last = days[days.length - 1].getTime();
    if (next.getTime() < first) navigateWeek(-7);
    else if (next.getTime() > last) navigateWeek(7);
    setSelected(key(next));
    window.setTimeout(
      () =>
        panelRef.current
          ?.querySelector<HTMLButtonElement>(`[data-date="${key(next)}"]`)
          ?.focus(),
      0,
    );
  };
  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-calendar-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p>{t.sections.schedule}</p>
            <h2 id="release-calendar-title">{t.sections.releaseCalendar}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.sections.closeCalendar}
          >
            <X />
          </button>
        </header>
        <div className={styles.navigator}>
          <button
            type="button"
            onClick={() => {
              navigateWeek(-7);
            }}
            aria-label={t.sections.previousWeek}
          >
            <ChevronLeft />
          </button>
          <div className={styles.selectedDate}>
            <strong>
              {new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
                timeZone: RELEASE_SCHEDULE_TIME_ZONE,
              }).format(selectedDate)}
            </strong>
            <small>{selectedContext}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              navigateWeek(7);
            }}
            aria-label={t.sections.nextWeek}
          >
            <ChevronRight />
          </button>
        </div>
        <div className={styles.days}>
          {days.map((day) => {
            const value = key(day);
            return (
              <button
                type="button"
                className={value === selected ? styles.activeDay : ""}
                data-today={value === today}
                data-date={value}
                aria-pressed={value === selected}
                aria-label={new Intl.DateTimeFormat(locale, {
                  dateStyle: "full",
                  timeZone: RELEASE_SCHEDULE_TIME_ZONE,
                }).format(day)}
                onClick={() => setSelected(value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectAdjacentDay(day, -1);
                  }
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectAdjacentDay(day, 1);
                  }
                }}
                key={value}
              >
                <span>
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "short",
                    timeZone: RELEASE_SCHEDULE_TIME_ZONE,
                  }).format(day)}
                </span>
                <strong>{day.getUTCDate()}</strong>
                {value === today && <small>{t.labels.today}</small>}
              </button>
            );
          })}
        </div>
        <div className={styles.list} aria-live="polite">
          {status === "loading" ? (
            Array.from({ length: 5 }, (_, index) => (
              <div className={styles.skeleton} key={index} />
            ))
          ) : status === "error" || !schedule.available ? (
            <div className={styles.empty}>
              <CalendarDays />
              <p>{t.sections.homeScheduleError}</p>
              <button type="button" onClick={retry}>
                <RotateCw size={14} />
                {t.player.retry}
              </button>
            </div>
          ) : releases.length === 0 ? (
            <div className={styles.empty}>
              <CalendarDays />
              <p>{t.sections.noReleasesDay}</p>
              <small>{t.sections.chooseAnotherDay}</small>
            </div>
          ) : (
            releases.map((release) => {
              const date = new Date(release.airingAt * 1000);
              return (
                <Link
                  href={release.href ?? `/anime/${release.anime.slug}`}
                  className={styles.release}
                  key={`${release.anime.id}-${release.episode}`}
                  onClick={onClose}
                >
                  <div className={styles.poster}>
                    <AnimePoster anime={release.anime} sizes="48px" />
                  </div>
                  <div>
                    <h3>{getLocalizedAnimeTitle(release.anime, locale)}</h3>
                    <p>
                      {t.labels.episode} {release.episode}
                    </p>
                  </div>
                  <time dateTime={date.toISOString()}>
                    {new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: RELEASE_SCHEDULE_TIME_ZONE,
                    }).format(date)}
                    {release.airingAt * 1000 <= openedAt && (
                      <small>{t.sections.aired}</small>
                    )}
                  </time>
                  <ChevronRight aria-hidden="true" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
