"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KairoPlayer } from "@/components/player/KairoPlayer";
import type { PlaybackEvent } from "@/components/player/KairoPlayer";
import { useAccountData } from "@/components/data/AccountDataProvider";
import {
  playbackDescriptorSchema,
  playbackTitleInfoSchema,
  type PlaybackDescriptor,
  type PlaybackTranslation,
} from "@/lib/playback/descriptor";
import { WatchControlGrid } from "./WatchControlGrid";
import styles from "./page.module.css";
import {
  canResumeWatchProgress,
  WATCH_COMPLETION_PERCENT,
  WATCH_SAVE_INTERVAL_MS,
} from "@/lib/watch-progress/policy";
import {
  AUTONEXT_COUNTDOWN_SECONDS,
  getNextEpisode,
} from "@/lib/playback/autonext";

type LoadState =
  "initial" | "loading-translations" | "resolving" | "ready" | "error";

type AutonextState = {
  sourceKey: string;
  fromEpisode: number;
  nextEpisode: number;
  remaining: number;
};

async function readJson(response: Response) {
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      value && typeof value === "object" && "error" in value
        ? (value.error as { message?: unknown }).message
        : null;
    throw new Error(
      typeof message === "string" ? message : "Не удалось загрузить видео.",
    );
  }
  return value;
}

export function AnimePlaybackPanel({
  animeSlug,
  shikimoriId,
  initialEpisode,
  episodeCount,
  titles,
  year,
  mediaType,
  debugSimulateKodikFailure,
}: {
  animeSlug: string;
  shikimoriId?: number;
  initialEpisode: number;
  episodeCount?: number;
  titles: string[];
  year?: number;
  mediaType?: string;
  debugSimulateKodikFailure?: string;
}) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [translations, setTranslations] = useState<PlaybackTranslation[]>([]);
  const [translationId, setTranslationId] = useState("");
  const [descriptor, setDescriptor] = useState<PlaybackDescriptor | null>(null);
  const [state, setState] = useState<LoadState>("initial");
  const [error, setError] = useState("");
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const [autonext, setAutonext] = useState<AutonextState | null>(null);
  const [autoPlayRequest, setAutoPlayRequest] = useState(0);
  const { mode, progress, syncStatus, upsertProgress } = useAccountData();
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const snapshotRef = useRef<PlaybackEvent | null>(null);
  const lastWriteRef = useRef(0);
  const lastSavedRef = useRef<{
    episode: number;
    currentTime: number;
    savedAt: number;
  } | null>(null);
  const resumedSourceRef = useRef("");
  const cancelledEndedRef = useRef("");

  const saveSnapshot = useCallback(
    (force = false, completedOverride = false) => {
      const snapshot = snapshotRef.current;
      if (
        mode.kind !== "account" ||
        !snapshot ||
        snapshot.seeking ||
        !Number.isFinite(snapshot.currentTime) ||
        !Number.isFinite(snapshot.duration) ||
        snapshot.currentTime < 1 ||
        snapshot.duration <= 0
      )
        return;
      const now = Date.now();
      if (!force && now - lastWriteRef.current < WATCH_SAVE_INTERVAL_MS) return;
      const lastSaved = lastSavedRef.current;
      if (
        !completedOverride &&
        lastSaved?.episode === snapshot.episode &&
        now - lastSaved.savedAt < 3_000 &&
        Math.abs(lastSaved.currentTime - snapshot.currentTime) < 3
      )
        return;
      lastWriteRef.current = now;
      lastSavedRef.current = {
        episode: snapshot.episode,
        currentTime: completedOverride
          ? snapshot.duration
          : snapshot.currentTime,
        savedAt: now,
      };
      upsertProgress({
        animeSlug,
        seasonNumber: 1,
        episodeNumber: snapshot.episode,
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        completed:
          completedOverride ||
          (snapshot.currentTime / snapshot.duration) * 100 >=
            WATCH_COMPLETION_PERCENT,
        updatedAt: new Date().toISOString(),
      });
    },
    [animeSlug, mode.kind, upsertProgress],
  );

  const onPlaybackEvent = useCallback(
    (event: PlaybackEvent) => {
      snapshotRef.current = event;
      if (event.event === "timeupdate" && !event.paused && !event.seeking)
        saveSnapshot(false);
      else if (event.event === "pause" || event.event === "seeked")
        saveSnapshot(true);
      else if (event.event === "ended") {
        saveSnapshot(true, true);
        const nextEpisode = getNextEpisode(event.episode, episodeCount);
        const sourceKey = `${event.episode}:${event.sourceUrl}`;
        if (nextEpisode && cancelledEndedRef.current !== sourceKey)
          setAutonext({
            sourceKey,
            fromEpisode: event.episode,
            nextEpisode,
            remaining: AUTONEXT_COUNTDOWN_SECONDS,
          });
      }
    },
    [episodeCount, saveSnapshot],
  );

  const resolvePlayback = useCallback(
    async (
      nextEpisode: number,
      nextTranslationId: string,
      nextTranslationName?: string,
    ) => {
      if (!shikimoriId) {
        setError("Для этого тайтла пока недоступен идентификатор источника.");
        setState("error");
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = ++generationRef.current;
      setState("resolving");
      setError("");
      try {
        const query = new URLSearchParams({
          shikimoriId: String(shikimoriId),
          episode: String(nextEpisode),
        });
        if (nextTranslationId) query.set("translationId", nextTranslationId);
        if (nextTranslationName)
          query.set("translationName", nextTranslationName);
        titles.forEach((title) => query.append("title", title));
        if (year) query.set("year", String(year));
        if (mediaType) query.set("mediaType", mediaType);
        if (debugSimulateKodikFailure)
          query.set("simulateKodikFailure", debugSimulateKodikFailure);
        const response = await fetch(`/api/playback/resolve?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const nextDescriptor = playbackDescriptorSchema.parse(
          await readJson(response),
        );
        if (generation !== generationRef.current) return;
        setDescriptor(nextDescriptor);
        const pending = snapshotRef.current;
        setResumePosition(
          pending?.episode === nextEpisode && pending.currentTime >= 5
            ? pending.currentTime
            : null,
        );
        setState("ready");
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        if (generation !== generationRef.current) return;
        setDescriptor(null);
        setError(
          reason instanceof Error
            ? reason.message
            : "Не удалось загрузить видео.",
        );
        setState("error");
      }
    },
    [debugSimulateKodikFailure, mediaType, shikimoriId, titles, year],
  );

  const loadTranslations = useCallback(async () => {
    if (!shikimoriId) {
      setError("Для этого тайтла пока недоступен идентификатор источника.");
      setState("error");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setState("loading-translations");
    setError("");
    try {
      const response = await fetch(
        `/api/playback/kodik/translations?shikimoriId=${shikimoriId}`,
        { cache: "no-store", signal: controller.signal },
      );
      const info = playbackTitleInfoSchema.parse(await readJson(response));
      if (generation !== generationRef.current) return;
      setTranslations(info.translations);
      const selected = info.translations[0]?.id ?? "";
      setTranslationId(selected);
      await resolvePlayback(
        initialEpisode,
        selected,
        info.translations[0]?.name,
      );
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError")
        return;
      if (generation !== generationRef.current) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось загрузить переводы.",
      );
      setState("error");
    }
  }, [initialEpisode, resolvePlayback, shikimoriId]);

  useEffect(() => {
    lastWriteRef.current = Date.now();
  }, []);

  useEffect(() => {
    const start = window.setTimeout(() => void loadTranslations(), 0);
    return () => {
      window.clearTimeout(start);
      abortRef.current?.abort();
    };
  }, [loadTranslations]);

  useEffect(() => {
    if (
      mode.kind !== "account" ||
      !descriptor ||
      ["idle", "loading"].includes(syncStatus)
    )
      return;
    const sourceKey = `${episode}:${descriptor.sources[0]?.url ?? "none"}`;
    if (resumedSourceRef.current === sourceKey) return;
    const saved = progress.find(
      (entry) =>
        entry.animeSlug === animeSlug &&
        entry.seasonNumber === 1 &&
        entry.episodeNumber === episode,
    );
    if (!saved) return;
    resumedSourceRef.current = sourceKey;
    const timer = window.setTimeout(
      () =>
        setResumePosition(
          canResumeWatchProgress(saved) ? saved.currentTime : null,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [animeSlug, descriptor, episode, mode.kind, progress, syncStatus]);

  const switchEpisode = useCallback(
    (nextEpisode: number, autoplay = false) => {
      saveSnapshot(true);
      setAutonext(null);
      snapshotRef.current = null;
      setResumePosition(null);
      setDescriptor(null);
      setEpisode(nextEpisode);
      const url = new URL(window.location.href);
      url.searchParams.set("episode", String(nextEpisode));
      url.searchParams.set("season", "1");
      url.hash = "player";
      window.history.replaceState(window.history.state, "", url);
      if (autoplay) setAutoPlayRequest((value) => value + 1);
      void resolvePlayback(
        nextEpisode,
        translationId,
        translations.find((item) => item.id === translationId)?.name,
      );
    },
    [resolvePlayback, saveSnapshot, translationId, translations],
  );

  useEffect(() => {
    if (!autonext) return;
    const timer = window.setInterval(() => {
      setAutonext((current) => {
        if (!current || current.sourceKey !== autonext.sourceKey)
          return current;
        if (current.remaining <= 1) {
          window.clearInterval(timer);
          const snapshot = snapshotRef.current;
          if (
            snapshot?.episode === current.fromEpisode &&
            `${snapshot.episode}:${snapshot.sourceUrl}` === current.sourceKey
          )
            window.setTimeout(
              () => switchEpisode(current.nextEpisode, true),
              0,
            );
          return null;
        }
        return { ...current, remaining: current.remaining - 1 };
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [autonext, switchEpisode]);

  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === "hidden") saveSnapshot(true);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      saveSnapshot(true);
    };
  }, [saveSnapshot]);

  const selectTranslation = (nextTranslationId: string) => {
    saveSnapshot(true);
    setAutonext(null);
    setDescriptor(null);
    setTranslationId(nextTranslationId);
    void resolvePlayback(
      episode,
      nextTranslationId,
      translations.find((item) => item.id === nextTranslationId)?.name,
    );
  };

  return (
    <>
      <div
        className={styles.playerColumn}
        data-progress-mode={mode.kind}
        data-progress-count={progress.length}
        data-progress-sync-status={syncStatus}
      >
        <p className={styles.stageLabel}>01 / Kairo Watch</p>
        <KairoPlayer
          descriptor={descriptor}
          onPlaybackEvent={onPlaybackEvent}
          resumePosition={resumePosition}
          autoPlayRequest={autoPlayRequest}
          emptyMessage={
            state === "error"
              ? "Не удалось загрузить видео."
              : "Загрузка видео…"
          }
          showTelemetry={false}
          episodeNavigation={{
            current: episode,
            count: episodeCount,
            loading: state === "resolving",
            hidden: Boolean(autonext),
            onChange: (nextEpisode) => switchEpisode(nextEpisode, true),
          }}
        />
        {autonext ? (
          <div className={styles.autonext} data-testid="autonext" role="status">
            <p>
              Следующая серия через <strong>{autonext.remaining}</strong> секунд
            </p>
            <div>
              <button
                type="button"
                onClick={() => switchEpisode(autonext.nextEpisode, true)}
              >
                Смотреть сейчас
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelledEndedRef.current = autonext.sourceKey;
                  setAutonext(null);
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
        {state === "error" ? (
          <div className={styles.playbackError} role="alert">
            <p>{error || "Не удалось загрузить видео."}</p>
            <button
              type="button"
              onClick={() =>
                translations.length
                  ? void resolvePlayback(
                      episode,
                      translationId,
                      translations.find((item) => item.id === translationId)
                        ?.name,
                    )
                  : void loadTranslations()
              }
            >
              Попробовать снова
            </button>
          </div>
        ) : null}
      </div>
      <WatchControlGrid
        animeSlug={animeSlug}
        episodeCount={episodeCount}
        activeEpisode={episode}
        onEpisodeChange={(nextEpisode) => switchEpisode(nextEpisode)}
        translations={translations}
        translationId={translationId}
        onTranslationChange={selectTranslation}
        translationsLoading={state === "loading-translations"}
      />
    </>
  );
}
