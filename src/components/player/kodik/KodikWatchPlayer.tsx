"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n";
import { PlayerLoader } from "../PlayerLoader";
import type { KodikPlayerHandle } from "./kodik-player.types";
import type { KodikWatchPlaybackDto } from "./kodik-watch.types";

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
  const { dictionary: t } = useLocale();
  const currentTimeRef = useRef(0);
  const matchingInitialPlayback =
    initialDirectPlayback?.playerLink === playback.playerLink
      ? initialDirectPlayback.playback
      : null;
  const [directPlayback, setDirectPlayback] = useState<DirectPlayback | null>(
    matchingInitialPlayback,
  );
  const [directUnavailable, setDirectUnavailable] = useState(false);
  const [loadingDirect, setLoadingDirect] = useState(!matchingInitialPlayback);
  const [automaticRetryCount, setAutomaticRetryCount] = useState(0);
  const refreshAttemptedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);

  const loadDirectPlayback = useCallback(
    async (forceRefresh = false) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoadingDirect(true);
      setDirectUnavailable(false);
      try {
        const attempts = forceRefresh ? [true] : [false, true];
        let lastError: unknown;
        for (const refresh of attempts) {
          try {
            const response = await fetch("/api/kodik/streams", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                playerLink: playback.playerLink,
                forceRefresh: refresh,
              }),
              cache: "no-store",
              signal: controller.signal,
            });
            if (!response.ok)
              throw new Error(`Kodik streams: ${response.status}`);
            const payload = (await response.json()) as DirectPlayback;
            if (!Array.isArray(payload.sources) || !payload.sources.length)
              throw new Error("Kodik streams: empty response");
            setDirectPlayback(payload);
            setDirectUnavailable(false);
            setAutomaticRetryCount(0);
            return;
          } catch (error) {
            if (controller.signal.aborted) return;
            lastError = error;
          }
        }
        throw lastError;
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
      setAutomaticRetryCount(0);
      void loadDirectPlayback();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      requestRef.current?.abort();
    };
  }, [loadDirectPlayback, matchingInitialPlayback]);

  useEffect(() => {
    if (!directUnavailable || automaticRetryCount >= 3) return;
    const timeout = window.setTimeout(
      () => {
        setAutomaticRetryCount((count) => count + 1);
        void loadDirectPlayback(true);
      },
      1_500 * 2 ** automaticRetryCount,
    );
    return () => window.clearTimeout(timeout);
  }, [automaticRetryCount, directUnavailable, loadDirectPlayback]);

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

  if (directEpisode && !directUnavailable) {
    return (
      <PlayerLoader
        episode={directEpisode}
        animeTitle={title}
        seasonNumber={seasonNumber}
        onHandle={onHandle}
        partyEvents={directPartyEvents}
        onPlaybackError={() => {
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
        <p>{t.player.preparing}…</p>
      </div>
    );
  }

  return (
    <div className="kairo-player kodik-embed-player player-error" role="alert">
      <p>{t.player.loadError}</p>
      <div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            refreshAttemptedRef.current = false;
            setAutomaticRetryCount(0);
            void loadDirectPlayback(true);
          }}
        >
          {t.player.retry}
        </button>
      </div>
    </div>
  );
}
