"use client";

import Hls from "hls.js";
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccountData } from "@/components/data/AccountDataProvider";
import type { WatchEpisode } from "@/data/watch/types";
import { useLocale } from "@/i18n";
import type { KodikPlayerHandle } from "./kodik/kodik-player.types";
import styles from "./HlsKairoPlayer.module.css";

type PlayerProps = {
  episode: WatchEpisode;
  animeTitle: string;
  seasonNumber?: number;
  onHandle?: (handle: KodikPlayerHandle | null) => void;
  partyEvents?: {
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onTimeUpdate?: (time: number) => void;
    onSpeedChange?: (speed: number) => void;
  };
  onPlaybackError?: (reason?: "fatal" | "stall") => void;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(value / 60);
  return `${minutes}:${seconds}`;
}

export function HlsKairoPlayer({
  episode,
  animeTitle,
  seasonNumber = 1,
  onHandle,
  partyEvents,
  onPlaybackError,
}: PlayerProps) {
  const { dictionary: t } = useLocale();
  const { progress, upsertProgress } = useAccountData();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);
  const errorRecoveriesRef = useRef(0);
  const source = episode.sources.find((item) => item.type === "hls");
  const saved = progress.find(
    (item) =>
      item.animeSlug === episode.animeSlug &&
      item.seasonNumber === seasonNumber &&
      item.episodeNumber === episode.episodeNumber,
  );

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quality, setQuality] = useState(-1);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [speed, setSpeed] = useState(1);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null)
      window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const revealControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    if (playing && !menuOpen)
      hideTimerRef.current = window.setTimeout(
        () => setControlsVisible(false),
        3000,
      );
  }, [clearHideTimer, menuOpen, playing]);

  const saveProgress = useCallback(
    (completed = false) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
        return;
      upsertProgress({
        animeSlug: episode.animeSlug,
        seasonNumber,
        episodeNumber: episode.episodeNumber,
        currentTime: video.currentTime,
        duration: video.duration,
        updatedAt: new Date().toISOString(),
        completed: completed || video.currentTime / video.duration >= 0.93,
      });
      lastSavedAtRef.current = Date.now();
    },
    [episode.animeSlug, episode.episodeNumber, seasonNumber, upsertProgress],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) {
      onPlaybackError?.("fatal");
      return;
    }
    setLoading(true);
    errorRecoveriesRef.current = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1,
        capLevelToPlayerSize: true,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferHole: 0.8,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(source.url));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels
            .map((level, index) => ({ index, height: level.height || 0 }))
            .filter((level) => level.height > 0)
            .sort((a, b) => b.height - a.height),
        );
        setLoading(false);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.autoLevelEnabled) setQuality(-1);
        else setQuality(data.level);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        errorRecoveriesRef.current += 1;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (errorRecoveriesRef.current <= 3) {
            hls.startLoad();
            return;
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (errorRecoveriesRef.current <= 3) {
            hls.recoverMediaError();
            return;
          }
        }
        onPlaybackError?.("fatal");
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source.url;
      setLoading(false);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    onPlaybackError?.("fatal");
  }, [onPlaybackError, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handle: KodikPlayerHandle = {
      play: () => {
        void video.play();
        return true;
      },
      pause: () => {
        video.pause();
        return true;
      },
      seek: (seconds) => {
        video.currentTime = Math.max(0, Math.min(seconds, video.duration || seconds));
        return true;
      },
      setVolume: (nextVolume) => {
        video.volume = Math.max(0, Math.min(1, nextVolume));
        return true;
      },
      mute: () => {
        video.muted = true;
        return true;
      },
      unmute: () => {
        video.muted = false;
        return true;
      },
      changeEpisode: () => false,
      setSpeed: (nextSpeed) => {
        video.playbackRate = nextSpeed;
        return true;
      },
      enterPip: () => {
        void video.requestPictureInPicture?.();
        return Boolean(video.requestPictureInPicture);
      },
      exitPip: () => {
        if (document.pictureInPictureElement) void document.exitPictureInPicture();
        return true;
      },
      getTime: () => true,
    };
    onHandle?.(handle);
    return () => onHandle?.(null);
  }, [onHandle]);

  useEffect(() => {
    const onFullscreen = () =>
      setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(revealControls);
    return () => {
      window.cancelAnimationFrame(frame);
      clearHideTimer();
    };
  }, [clearHideTimer, revealControls]);

  useEffect(() => {
    const save = () => saveProgress();
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [saveProgress]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current?.requestFullscreen();
  }, []);

  const setLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setQuality(index);
  }, []);

  const qualityLabel = useMemo(() => {
    if (quality < 0) return t.player.auto;
    return `${levels.find((level) => level.index === quality)?.height ?? ""}p`;
  }, [levels, quality, t.player.auto]);

  return (
    <div
      className={`${styles.player} ${controlsVisible ? styles.visible : ""}`}
      ref={rootRef}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && !menuOpen && setControlsVisible(false)}
      onClick={revealControls}
    >
      <video
        aria-label={`${animeTitle} — ${episode.titleRu}`}
        className={styles.video}
        playsInline
        preload="auto"
        ref={videoRef}
        onClick={(event) => {
          event.stopPropagation();
          togglePlay();
          revealControls();
        }}
        onPlay={() => {
          setPlaying(true);
          partyEvents?.onPlay?.();
        }}
        onPause={() => {
          setPlaying(false);
          saveProgress();
          partyEvents?.onPause?.();
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setBuffering(false);
          setLoading(false);
        }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration);
          if (
            saved &&
            saved.currentTime > 5 &&
            saved.currentTime < video.duration - 30
          )
            video.currentTime = saved.currentTime;
        }}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          setCurrentTime(time);
          partyEvents?.onTimeUpdate?.(time);
          if (Date.now() - lastSavedAtRef.current >= 20_000) saveProgress();
        }}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onRateChange={(event) => {
          setSpeed(event.currentTarget.playbackRate);
          partyEvents?.onSpeedChange?.(event.currentTarget.playbackRate);
        }}
        onEnded={() => saveProgress(true)}
      />

      {(loading || buffering) && (
        <div className={styles.loader}>
          <i />
          <span>{loading ? t.player.preparing : t.player.reconnecting}</span>
        </div>
      )}

      {!playing && !loading && (
        <button className={styles.centerPlay} onClick={togglePlay} type="button">
          <Play fill="currentColor" />
        </button>
      )}

      <div className={styles.controls} onClick={(event) => event.stopPropagation()}>
        <input
          aria-label={t.player.loading}
          className={styles.timeline}
          max={duration || 0}
          min="0"
          onChange={(event) => {
            const time = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = time;
            setCurrentTime(time);
            partyEvents?.onSeek?.(time);
          }}
          step="0.1"
          type="range"
          value={Math.min(currentTime, duration || 0)}
        />
        <div className={styles.controlRow}>
          <button aria-label={playing ? t.player.pause : t.player.play} onClick={togglePlay} type="button">
            {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
          <button
            aria-label={muted ? t.player.unmute : t.player.mute}
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
            type="button"
          >
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </button>
          <input
            aria-label={t.player.volume}
            className={styles.volume}
            max="1"
            min="0"
            onChange={(event) => {
              if (videoRef.current) videoRef.current.volume = Number(event.target.value);
            }}
            step="0.05"
            type="range"
            value={volume}
          />
          <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span className={styles.title}>{animeTitle}</span>
          <div className={styles.settingsWrap}>
            <button
              aria-expanded={menuOpen}
              aria-label={t.player.quality}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <Settings />
              <small>{qualityLabel}</small>
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <strong>{t.player.quality}</strong>
                <button className={quality < 0 ? styles.active : ""} onClick={() => setLevel(-1)} type="button">{t.player.auto}</button>
                {levels.map((level) => (
                  <button className={quality === level.index ? styles.active : ""} key={level.index} onClick={() => setLevel(level.index)} type="button">{level.height}p</button>
                ))}
                <strong>{t.player.speed}</strong>
                <div className={styles.speeds}>
                  {SPEEDS.map((value) => (
                    <button className={speed === value ? styles.active : ""} key={value} onClick={() => {
                      if (videoRef.current) videoRef.current.playbackRate = value;
                    }} type="button">{value}×</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button aria-label={t.player.pip} onClick={() => void videoRef.current?.requestPictureInPicture?.()} type="button"><PictureInPicture /></button>
          <button aria-label={fullscreen ? t.player.exitFullscreen : t.player.fullscreen} onClick={() => void toggleFullscreen()} type="button">
            {fullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
    </div>
  );
}
