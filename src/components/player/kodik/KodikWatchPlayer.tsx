"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n";
import { PlayerLoader } from "../PlayerLoader";
import { KodikPlayerShell } from "./KodikPlayerShell";
import type { KodikPlayerHandle } from "./kodik-player.types";
import type { KodikWatchPlaybackDto } from "./kodik-watch.types";
import {
  resolveDirectPlayback,
  type PlaybackRequestReason,
} from "./direct-playback-resolver";
import styles from "./KodikWatchPlayer.module.css";

type PlayerMode = "kairo" | "kodik";

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
  iframeFallbackUrl?: string;
};

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
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerMode>(
    matchingInitialPlayback ? "kairo" : "kodik",
  );
  const refreshAttemptedRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const manualSelectionRef = useRef(false);
  const playbackIdentity = `${animeSlug}|${seasonNumber}|${episodeNumber}|${playback.translation.id}|${playback.kodikId}`;

  const loadDirectPlayback = useCallback(
    async (reason: PlaybackRequestReason) => {
      const generation = ++requestGenerationRef.current;
      setLoadingDirect(true);
      setDirectUnavailable(false);
      try {
        const payload = await resolveDirectPlayback(
          {
            animeSlug,
            seasonNumber,
            episodeNumber,
            translationId: playback.translation.id,
            sourceId: playback.kodikId,
          },
          playback.playerLink,
          reason,
          fetch,
          reason === "fatal-playback-recovery",
        );
        if (generation !== requestGenerationRef.current) return;
        if (payload.mode === "kodik-iframe") {
          // A transient resolver fallback must never displace an already
          // working direct player. Only the initial resolve may enter iframe.
          if (!directPlayback || reason === "fatal-playback-recovery")
            setDirectUnavailable(true);
          return;
        }
        if (!Array.isArray(payload.sources) || !payload.sources.length)
          throw new Error("Kodik streams: empty response");
        setDirectPlayback({
          sources: payload.sources.map((source) => ({ ...source, quality: Number(source.quality) })),
          chapters: (payload.skipSegments ?? []).map((segment, index) => ({
            id: `kodik-${segment.type}-${index}`,
            title: segment.type === "ending" ? "Титры" : segment.type === "opening" ? "Заставка" : "Пропустить",
            startTime: segment.from,
            endTime: segment.to,
            type: segment.type === "ending" ? "credits" : "intro",
          })),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          iframeFallbackUrl: payload.iframeFallbackUrl,
        });
        setDirectUnavailable(false);
        if (reason === "initial-load" && !manualSelectionRef.current)
          setSelectedPlayer("kairo");
      } catch (error) {
        if (process.env.NODE_ENV === "development")
          console.warn("[Kairo player] Direct Kodik playback unavailable", error);
        if (!directPlayback) setDirectUnavailable(true);
      } finally {
        if (generation === requestGenerationRef.current) setLoadingDirect(false);
      }
    },
    [animeSlug, directPlayback, episodeNumber, playback.kodikId, playback.playerLink, playback.translation.id, seasonNumber],
  );

  useEffect(() => {
    refreshAttemptedRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      manualSelectionRef.current = false;
      setSelectedPlayer(matchingInitialPlayback ? "kairo" : "kodik");
      if (!matchingInitialPlayback) void loadDirectPlayback("initial-load");
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  // Selection resets only when the playback identity changes, never when the
  // resolver merely updates the descriptor for the same episode.
  }, [playbackIdentity]);

  const selectPlayer = useCallback((next: PlayerMode) => {
    if (next === selectedPlayer) return;
    manualSelectionRef.current = true;
    if (process.env.NEXT_PUBLIC_KAIRO_PLAYBACK_DEBUG === "true")
      console.info("[KairoPlayerSelector] SELECT", { from: selectedPlayer, to: next, reason: "user" });
    if (next === "kairo" && !directPlayback) {
      setSelectedPlayer("kairo");
      void loadDirectPlayback("manual-retry");
      return;
    }
    setSelectedPlayer(next);
  }, [directPlayback, loadDirectPlayback, selectedPlayer]);

  const directEpisode = useMemo(
    () =>
      directPlayback
        ? {
            animeSlug,
            episodeNumber,
            titleRu: title,
            titleEn: title,
            descriptionRu: "",
            descriptionEn: "",
            sources: directPlayback.sources.map((source) => ({
                id: `kodik-${playback.kodikId}-${episodeNumber}-${source.quality}`,
                type: "hls" as const,
                url: source.url,
                label: `Kodik ${source.quality}p`,
                isDemo: false,
              })),
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

  const selector = (
    <div className={styles.selector} aria-label="Плеер">
      <span>Плеер:</span>
      <button type="button" className={selectedPlayer === "kairo" ? styles.active : ""} onClick={() => selectPlayer("kairo")} aria-pressed={selectedPlayer === "kairo"}>Kairo</button>
      <button type="button" className={selectedPlayer === "kodik" ? styles.active : ""} onClick={() => selectPlayer("kodik")} aria-pressed={selectedPlayer === "kodik"}>Kodik</button>
    </div>
  );

  const iframeFallbackUrl = directPlayback?.iframeFallbackUrl ?? playback.playerLink;
  const canUseKairo = Boolean(directEpisode && !directUnavailable);
  const canUseKodik = Boolean(iframeFallbackUrl);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_KAIRO_PLAYBACK_DEBUG !== "true") return;
    const renderer = selectedPlayer === "kairo" && canUseKairo ? "hls-kairo" : "kodik-iframe";
    console.info("[KairoRenderer] MOUNT", {
      renderer,
      selectedPlayer,
      ...(renderer === "hls-kairo" ? { sourcesCount: directPlayback?.sources.length ?? 0 } : { iframeUrlPresent: canUseKodik }),
    });
    return () => console.info("[KairoRenderer] UNMOUNT", { renderer });
  }, [canUseKairo, canUseKodik, directPlayback?.sources.length, selectedPlayer]);

  if (selectedPlayer === "kairo" && canUseKairo) {
    return (
      <div className={styles.root}>{selector}<PlayerLoader
        episode={directEpisode!}
        directSources={directPlayback?.sources}
        debug={false}
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
          void loadDirectPlayback("fatal-playback-recovery");
        }}
      /></div>
    );
  }

  if (selectedPlayer === "kairo" && loadingDirect && !directUnavailable) {
    return (
      <div className={styles.root}>{selector}<div className="kairo-player kodik-embed-player player-loading">
        <i />
        <p>{t.player.preparing}…</p>
      </div></div>
    );
  }

  if (selectedPlayer === "kodik" && canUseKodik) return (<div className={styles.root}>{selector}<KodikPlayerShell
      ref={(handle) => onHandle?.(handle)}
      src={iframeFallbackUrl}
      title={title}
      onPlay={partyEvents?.onPlay}
      onPause={partyEvents?.onPause}
      onSeek={partyEvents?.onSeek}
      onTimeUpdate={partyEvents?.onTimeUpdate}
      onSpeedChange={partyEvents?.onSpeedChange}
    /></div>);

  return <div className={styles.root}>{selector}<p className="player-loading">{t.player.preparing}…</p></div>;
}
