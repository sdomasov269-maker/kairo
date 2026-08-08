"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { KodikPlayerShell } from "./KodikPlayerShell";
import type { KodikPlayerHandle } from "./kodik-player.types";
import type { KodikWatchPlaybackDto } from "./kodik-watch.types";
import {
  getKodikResumePosition,
  shouldPersistKodikProgress,
} from "./kodik-watch-progress";

export function KodikWatchPlayer({
  playback,
  animeSlug,
  seasonNumber,
  episodeNumber,
  title,
  onHandle,
  partyEvents,
}: {
  playback: KodikWatchPlaybackDto;
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  onHandle?: (handle: KodikPlayerHandle | null) => void;
  partyEvents?: { onPlay?: () => void; onPause?: () => void; onSeek?: (time: number) => void; onTimeUpdate?: (time: number) => void; onSpeedChange?: (speed: number) => void };
}) {
  const { progress, upsertProgress } = useAccountData();
  const playerRef = useRef<KodikPlayerHandle>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const resumedRef = useRef(false);
  const reportedEpisodeRef = useRef(playback.episode);
  const saved = progress.find(
    (entry) =>
      entry.animeSlug === animeSlug &&
      entry.seasonNumber === seasonNumber &&
      entry.episodeNumber === episodeNumber,
  );
  const resumePositionRef = useRef<number | null>(null);
  const resumePosition = getKodikResumePosition(saved);

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

  return (
    <div className="kairo-player kodik-embed-player">
      <KodikPlayerShell
        ref={playerRef}
        src={playback.playerLink}
        title={title}
        onPlay={partyEvents?.onPlay}
        onPause={() => { saveProgress(); partyEvents?.onPause?.(); }}
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
