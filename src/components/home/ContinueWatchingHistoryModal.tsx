"use client";

import { ChevronRight, Play, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef } from "react";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { useLocale } from "@/i18n";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import type { WatchProgressEntry } from "@/lib/watch-progress";
import { unifiedWatchUrl } from "@/lib/watch-route";
import type { Anime } from "@/types/media";
import styles from "./ContinueWatchingHistoryModal.module.css";

export function ContinueWatchingHistoryModal({
  anime,
  items,
  onClose,
  open,
}: {
  anime: Anime[];
  items: WatchProgressEntry[];
  onClose: () => void;
  open: boolean;
}) {
  const { locale, dictionary: t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);
  const catalogBySlug = useMemo(
    () => new Map(anime.map((item) => [item.slug, item])),
    [anime],
  );

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
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="continue-history-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p>{t.sections.history}</p>
            <h2 id="continue-history-title">{t.sections.continueWatching}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t.player.close}>
            <X />
          </button>
        </header>
        <div className={styles.list}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <Play />
              <p>{t.sections.emptyContinueHint}</p>
            </div>
          ) : (
            items.map((entry) => {
              const item = catalogBySlug.get(entry.animeSlug);
              const percent = Math.max(0, Math.min(100, entry.percent));
              const remaining =
                entry.duration > entry.currentTime
                  ? Math.ceil((entry.duration - entry.currentTime) / 60)
                  : null;
              return (
                <Link
                  className={styles.item}
                  href={unifiedWatchUrl(
                    entry.animeSlug,
                    entry.seasonNumber,
                    entry.episodeNumber,
                  )}
                  key={`${entry.animeSlug}-${entry.seasonNumber}-${entry.episodeNumber}`}
                  onClick={onClose}
                >
                  <div className={styles.poster}>
                    {item ? (
                      <AnimePoster anime={item} sizes="72px" />
                    ) : (
                      <Play aria-hidden="true" size={18} />
                    )}
                  </div>
                  <div className={styles.copy}>
                    <h3>
                      {item
                        ? getLocalizedAnimeTitle(item, locale)
                        : entry.animeSlug}
                    </h3>
                    <p>
                      {t.labels.season} {entry.seasonNumber} ·{" "}
                      {t.labels.episode} {entry.episodeNumber}
                    </p>
                    <span
                      className={styles.progress}
                      aria-label={`${Math.round(percent)}%`}
                    >
                      <i style={{ width: `${percent}%` }} />
                    </span>
                  </div>
                  <div className={styles.meta}>
                    <strong>{Math.round(percent)}%</strong>
                    {remaining !== null && (
                      <small>
                        {t.labels.remaining}: {remaining} {t.labels.minutes}
                      </small>
                    )}
                  </div>
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
