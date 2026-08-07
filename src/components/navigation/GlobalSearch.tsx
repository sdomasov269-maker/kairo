"use client";

import { Search, X, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useLocale } from "@/i18n";
import type { Anime } from "@/types/media";
import {
  formatScore,
  getLocalizedAnimeTitle,
  localizeFormat,
} from "@/lib/media-localization";
import { AnimePoster } from "@/components/anime/AnimePoster";

export function GlobalSearch({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { locale, dictionary: t } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(
            "button, a, input",
          ),
        ].filter((node) => !node.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open, onClose, triggerRef]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim().slice(0, 100))}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as { results?: Anime[] };
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 380);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  if (!open) return null;
  return (
    <div className="search-dialog-layer">
      <button
        className="search-overlay"
        onClick={onClose}
        aria-label={t.catalog.closeSearch}
      />
      <div
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        ref={dialogRef}
      >
        <div className="search-dialog-head">
          <div>
            <p className="eyebrow">Kairo discovery</p>
            <h2 id="global-search-title">{t.catalog.quickSearch}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t.catalog.closeSearch}
          >
            <X size={19} />
          </button>
        </div>
        <div className="global-search-input">
          <Search size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.catalog.placeholder}
            maxLength={100}
            aria-label={t.catalog.placeholder}
          />
          {loading && query.trim().length >= 2 && <i aria-label="Loading" />}
        </div>
        {query.length < 2 ? (
          <div className="popular-searches">
            <p>{t.catalog.popularSearches}</p>
            {["Frieren", "Cowboy Bebop", "Attack on Titan"].map((term) => (
              <button onClick={() => setQuery(term)} key={term}>
                {term}
              </button>
            ))}
          </div>
        ) : (
          <div className="quick-results" aria-live="polite">
            {results.map((anime) => (
              <Link
                href={`/anime/${anime.slug}`}
                onClick={onClose}
                key={anime.id}
                className="quick-result"
              >
                <AnimePoster
                  anime={anime}
                  className="quick-result-poster"
                  sizes="52px"
                />
                <div>
                  <strong>{getLocalizedAnimeTitle(anime, locale)}</strong>
                  <small>
                    {anime.year} · {localizeFormat(anime.format, locale)}
                  </small>
                </div>
                {anime.rating && (
                  <em>
                    <Star size={11} fill="currentColor" />
                    {formatScore(anime.rating, locale)}
                  </em>
                )}
              </Link>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && (
          <Link
            className="all-results-link"
            href={`/catalog?search=${encodeURIComponent(query.trim())}`}
            onClick={onClose}
          >
            {t.catalog.allResults}
            <span>↗</span>
          </Link>
        )}
      </div>
    </div>
  );
}
