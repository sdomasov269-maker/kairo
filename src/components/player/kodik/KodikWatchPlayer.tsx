"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { PlayerLoader } from "../PlayerLoader";
import { KodikPlayerShell } from "./KodikPlayerShell";
import type { KodikPlayerHandle } from "./kodik-player.types";
import type { KodikWatchPlaybackDto } from "./kodik-watch.types";
import {
  getKodikResumePosition,
  shouldPersistKodikProgress,
} from "./kodik-watch-progress";

export type DirectPlayback = {
  sources: { quality: number; url: string; mimeType: string }[];
  chapters: {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    type: "intro" | "credits";
  }[];
  expiresAt: string;
};

function buildMasterPlaylist(sources: DirectPlayback["sources"]) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];
  for (const source of sources) {
    const width = Math.round((source.quality * 16) / 9 / 2) * 2;
    const bandwidth = Math.max(350_000, source.quality * source.quality * 5);
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${source.quality},NAME="${source.quality}p"`,
      source.url,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function KodikWatchPlayer({
  playback,
  animeSlug,
  seasonNumber,
  episodeNumber,
  title,
  onHandle,
  partyEvents,
  initialDirectPlayback,
}: {
  playback: KodikWatchPlaybackDto;
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  onHandle?: (handle: KodikPlayerHandle | null) => void;
  partyEvents?: {
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onTimeUpdate?: (time: number) => void;
    onSpeedChange?: (speed: number) => void;
  };
  initialDirectPlayback?: {
    playerLink: string;
    playback: DirectPlayback;
  } | null;
}) {
  const { progress, upsertProgress } = useAccountData();
  const playerRef = useRef<KodikPlayerHandle>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const resumedRef = useRef(false);
  const reportedEpisodeRef = useRef(playback.episode);
  useEffect(() => {
    lastSavedAtRef.current = Date.now();
  }, []);
  const saved = progress.find(
    (entry) =>
      entry.animeSlug === animeSlug &&
      entry.seasonNumber === seasonNumber &&
      entry.episodeNumber === episodeNumber,
  );
  const resumePositionRef = useRef<number | null>(null);
  const resumePosition = getKodikResumePosition(saved);
  const matchingInitialPlayback =
    initialDirectPlayback?.playerLink === playback.playerLink
      ? initialDirectPlayback.playback
      : null;
  const [directPlayback, setDirectPlayback] = useState<DirectPlayback | null>(
    matchingInitialPlayback,
  );
  const [directUnavailable, setDirectUnavailable] = useState(false);
  const [loadingDirect, setLoadingDirect] = useState(!matchingInitialPlayback);
  const refreshAttemptedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);

  const loadDirectPlayback = useCallback(
    async (forceRefresh = false) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoadingDirect(true);
      try {
        const response = await fetch("/api/kodik/streams", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            playerLink: playback.playerLink,
            forceRefresh,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Kodik streams: ${response.status}`);
        const payload = (await response.json()) as DirectPlayback;
        if (!Array.isArray(payload.sources) || !payload.sources.length)
          throw new Error("Kodik streams: empty response");
        setDirectPlayback(payload);
        setDirectUnavailable(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (process.env.NODE_ENV === "development")
          console.warn("[Kairo player] Direct Kodik playback unavailable", error);
        setDirectUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setLoadingDirect(false);
      }
    },
    [playback.playerLink],
  );

  useEffect(() => {
    refreshAttemptedRef.current = false;
    if (matchingInitialPlayback) return;
    const frame = window.requestAnimationFrame(() => {
      void loadDirectPlayback();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      requestRef.current?.abort();
    };
  }, [loadDirectPlayback, matchingInitialPlayback]);

  useEffect(() => {
    if (!directPlayback) return;
    const url = URL.createObjectURL(
      new Blob([buildMasterPlaylist(directPlayback.sources)], {
        type: "application/vnd.apple.mpegurl",
      }),
    );
    const frame = window.requestAnimationFrame(() => setManifestUrl(url));
    return () => {
      window.cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [directPlayback]);

  const directEpisode = useMemo(
    () =>
      manifestUrl && directPlayback
        ? {
            animeSlug,
            episodeNumber,
            titleRu: title,
            titleEn: title,
            descriptionRu: "",
            descriptionEn: "",
            sources: [
              {
                id: `kodik-${playback.kodikId}-${episodeNumber}`,
                type: "hls" as const,
                url: manifestUrl,
                label: "Kodik HLS",
                isDemo: false,
              },
            ],
            subtitles: [],
            audioTracks: [
              {
                id: String(playback.translation.id),
                language: playback.translation.type === "voice" ? "ru" : "ja",
                label: playback.translation.title,
                studio: playback.translation.title,
              },
            ],
            chapters: directPlayback.chapters,
          }
        : null,
    [
      animeSlug,
      directPlayback,
      episodeNumber,
      manifestUrl,
      playback.kodikId,
      playback.translation.id,
      playback.translation.title,
      playback.translation.type,
      title,
    ],
  );

  useEffect(() => {
    resumePositionRef.current = resumePosition;
  }, [resumePosition]);

  const saveProgress = useCallback(
    (completed = false) => {
      const duration = durationRef.current;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const currentTime = currentTimeRef.current;
      upsertProgress({
        animeSlug,
        seasonNumber,
        episodeNumber,
        currentTime,
        duration,
        updatedAt: new Date().toISOString(),
        completed: completed || currentTime / duration >= 0.93,
      });
      lastSavedAtRef.current = Date.now();
    },
    [animeSlug, episodeNumber, seasonNumber, upsertProgress],
  );
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const resumeWhenReady = useCallback(() => {
    if (resumedRef.current) return;
    const position = resumePositionRef.current;
    if (position === null) return;
    if (playerRef.current?.seek(position)) resumedRef.current = true;
  }, []);

  const directPartyEvents = useMemo(
    () => ({
      ...partyEvents,
      onTimeUpdate: (time: number) => {
        currentTimeRef.current = time;
        partyEvents?.onTimeUpdate?.(time);
      },
    }),
    [partyEvents],
  );

  useEffect(() => {
    onHandle?.(playerRef.current);
    return () => onHandle?.(null);
  }, [onHandle]);

  useEffect(() => {
    const onPageHide = () => saveProgressRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveProgressRef.current();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      saveProgressRef.current();
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (directEpisode && !directUnavailable) {
    return (
      <PlayerLoader
        episode={directEpisode}
        animeTitle={title}
        seasonNumber={seasonNumber}
        onHandle={onHandle}
        partyEvents={directPartyEvents}
        onPlaybackError={(reason) => {
          resumePositionRef.current = currentTimeRef.current;
          resumedRef.current = false;
          if (reason === "stall") {
            setDirectUnavailable(true);
            return;
          }
          if (refreshAttemptedRef.current) {
            setDirectUnavailable(true);
            return;
          }
          refreshAttemptedRef.current = true;
          void loadDirectPlayback(true);
        }}
      />
    );
  }

  if (loadingDirect && !directUnavailable) {
    return (
      <div className="kairo-player kodik-embed-player player-loading">
        <i />
        <p>Подготовка видео…</p>
      </div>
    );
  }

  return (
    <div className="kairo-player kodik-embed-player">
      <KodikPlayerShell
        ref={playerRef}
        src={playback.playerLink}
        title={title}
        onPlay={partyEvents?.onPlay}
        onPause={() => {
          saveProgress();
          partyEvents?.onPause?.();
        }}
        onSeek={partyEvents?.onSeek}
        onTimeUpdate={(time) => {
          currentTimeRef.current = time;
          partyEvents?.onTimeUpdate?.(time);
          if (shouldPersistKodikProgress(lastSavedAtRef.current, Date.now()))
            saveProgress();
        }}
        onDurationUpdate={(duration) => {
          durationRef.current = duration;
          resumeWhenReady();
        }}
        onVideoStarted={resumeWhenReady}
        onEnded={() => saveProgress(true)}
        onSpeedChange={partyEvents?.onSpeedChange}
        onEpisodeChange={(episode) => {
          reportedEpisodeRef.current = episode.episode;
        }}
      />
    </div>
  );
}
