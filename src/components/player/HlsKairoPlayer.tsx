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
import {
  orderDirectHlsSources,
  selectDirectHlsSource,
} from "./direct-source";
import type { WatchEpisode } from "@/data/watch/types";
import { useLocale } from "@/i18n";
import type { KodikPlayerHandle } from "./kodik/kodik-player.types";
import styles from "./HlsKairoPlayer.module.css";

type PlayerProps = {
  episode: WatchEpisode;
  directSources?: { quality: number; url: string; mimeType: string }[];
  debug?: boolean;
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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
type ProgressSaveReason = "interval" | "pause" | "ended" | "pagehide" | "unmount";

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
  directSources,
  debug = false,
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
  const errorRecoveryUsedRef = useRef(false);
  const stallTimerRef = useRef<number | null>(null);
  const hlsGenerationRef = useRef(0);
  const lifecycleSourceRef = useRef<string | null>(null);
  const onPlaybackErrorRef = useRef(onPlaybackError);
  const telemetryRef = useRef<(
    channel: "KairoHLS" | "KairoVideo" | "KairoPlayback",
    event: string,
    detail?: Record<string, unknown>,
  ) => void>(() => {});
  const debugRef = useRef(debug);
  const selectedQualityRef = useRef<number | null>(null);
  const saveProgressRef = useRef<
    (reason: ProgressSaveReason, completed?: boolean) => void
  >(() => {});
  const restoreRef = useRef<{
    currentTime: number;
    playing: boolean;
    volume: number;
    muted: boolean;
    playbackRate: number;
  } | null>(null);
  const fixedSources = useMemo(() => orderDirectHlsSources(directSources ?? []), [directSources]);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
  const selectedDirectSource = selectDirectHlsSource(fixedSources, selectedQuality);
  const source = selectedDirectSource
    ? { url: selectedDirectSource.url, quality: selectedDirectSource.quality }
    : episode.sources.find((item) => item.type === "hls");
  const sourceUrl = source?.url;
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
  const [speed, setSpeed] = useState(1);

  const telemetry = useCallback(
    (channel: "KairoHLS" | "KairoVideo" | "KairoPlayback", event: string, detail: Record<string, unknown> = {}) => {
      const video = videoRef.current;
      if (!debug || !video) return;
      let bufferAhead = 0;
      for (let index = 0; index < video.buffered.length; index += 1) {
        if (video.currentTime >= video.buffered.start(index) && video.currentTime <= video.buffered.end(index)) {
          bufferAhead = video.buffered.end(index) - video.currentTime;
          break;
        }
      }
      console.info(`[${channel}] ${event}`, { currentTime: video.currentTime, paused: video.paused, readyState: video.readyState, networkState: video.networkState, bufferAhead, ...detail });
    },
    [debug],
  );

  // These values intentionally stay outside the Hls lifecycle effect: callers
  // re-render with new callback identities during normal playback.
  useEffect(() => {
    onPlaybackErrorRef.current = onPlaybackError;
    telemetryRef.current = telemetry;
    debugRef.current = debug;
    selectedQualityRef.current = selectedDirectSource?.quality ?? null;
  }, [debug, onPlaybackError, selectedDirectSource?.quality, telemetry]);

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
    (reason: ProgressSaveReason, completed = false) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
        return;
      if (debugRef.current) {
        console.info("[KairoProgress] SAVE", {
          reason,
          time: video.currentTime,
        });
      }
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
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceUrl) {
      onPlaybackErrorRef.current?.("fatal");
      return;
    }
    setLoading(true);
    errorRecoveryUsedRef.current = false;
    const generation = hlsGenerationRef.current + 1;
    hlsGenerationRef.current = generation;
    const previousSource = lifecycleSourceRef.current;
    const lifecycleDetail = {
      generation,
      source: sourceUrl,
      quality: selectedQualityRef.current,
    };
    if (debugRef.current) {
      if (previousSource === sourceUrl) {
        console.warn("[KairoHLSLifecycle] UNEXPECTED_RECREATE", lifecycleDetail);
      }
      console.info("[KairoHLSLifecycle] CREATE", {
        ...lifecycleDetail,
        reason: previousSource ? "source-url-changed" : "initial-source",
      });
    }
    lifecycleSourceRef.current = sourceUrl;

    if (Hls.isSupported()) {
      telemetryRef.current("KairoPlayback", "engine=hls.js");
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: 0,
        capLevelToPlayerSize: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferHole: 0.8,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
      });
      hlsRef.current?.destroy();
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (generation === hlsGenerationRef.current) hls.loadSource(sourceUrl);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (generation !== hlsGenerationRef.current) return;
        setLoading(false);
        telemetryRef.current("KairoHLS", "MANIFEST_PARSED", { manifestAttached: true });
      });
      for (const event of [Hls.Events.FRAG_LOADING, Hls.Events.FRAG_LOADED, Hls.Events.FRAG_BUFFERED, Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, Hls.Events.BUFFER_APPENDING, Hls.Events.BUFFER_APPENDED, Hls.Events.LEVEL_SWITCHING, Hls.Events.LEVEL_SWITCHED])
        hls.on(event, (_: unknown, data: { frag?: { sn?: number; start?: number; duration?: number }; level?: number }) => telemetryRef.current("KairoHLS", event, { sn: data?.frag?.sn, fragmentStart: data?.frag?.start, fragmentDuration: data?.frag?.duration, level: data?.level }));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (generation !== hlsGenerationRef.current) return;
        telemetryRef.current("KairoHLS", "ERROR", { type: data.type, details: data.details, fatal: data.fatal, status: data.response?.code, sn: data.frag?.sn, fragmentStart: data.frag?.start, fragmentDuration: data.frag?.duration });
        if (!data.fatal) return;
        if (errorRecoveryUsedRef.current) {
          onPlaybackErrorRef.current?.("fatal");
          return;
        }
        errorRecoveryUsedRef.current = true;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        onPlaybackErrorRef.current?.("fatal");
      });
      return () => {
        if (debugRef.current) {
          console.info("[KairoHLSLifecycle] DESTROY", {
            ...lifecycleDetail,
            currentTime: video.currentTime,
            reason: "source-url-changed-or-unmount",
          });
        }
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      telemetryRef.current("KairoPlayback", "engine=native-hls");
      video.src = sourceUrl;
      setLoading(false);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    onPlaybackErrorRef.current?.("fatal");
  }, [sourceUrl]);

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
    const save = () => saveProgressRef.current("pagehide");
    window.addEventListener("pagehide", save);
    return () => {
      saveProgressRef.current("unmount");
      window.removeEventListener("pagehide", save);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const startStallWatchdog = useCallback((reason: string) => {
    const video = videoRef.current;
    if (!video || video.paused || stallTimerRef.current !== null) return;
    const startedAt = video.currentTime;
    telemetryRef.current("KairoVideo", "stall started", { reason });
    stallTimerRef.current = window.setTimeout(() => {
      stallTimerRef.current = null;
      const current = videoRef.current;
      if (!current || current.paused || current.currentTime > startedAt + 0.1) {
        telemetryRef.current("KairoVideo", "stall recovered without reload", { reason });
        return;
      }
      if (!errorRecoveryUsedRef.current && hlsRef.current) {
        errorRecoveryUsedRef.current = true;
        telemetryRef.current("KairoHLS", "controlled stall recovery", { reason });
        hlsRef.current.startLoad();
        return;
      }
      telemetryRef.current("KairoHLS", "stall recovery exhausted", { reason });
      onPlaybackErrorRef.current?.("stall");
    }, 6_000);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current?.requestFullscreen();
  }, []);

  const switchQuality = useCallback((quality: number) => {
    const video = videoRef.current;
    if (!video || quality === selectedDirectSource?.quality) return;
    restoreRef.current = {
      currentTime: video.currentTime,
      playing: !video.paused,
      volume: video.volume,
      muted: video.muted,
      playbackRate: video.playbackRate,
    };
    setSelectedQuality(quality);
  }, [selectedDirectSource?.quality]);

  const qualityLabel = selectedDirectSource
    ? `${selectedDirectSource.quality}p`
    : "HLS";
  const skippableChapter = episode.chapters.find(
    (chapter) =>
      (chapter.type === "intro" || chapter.type === "credits") &&
      currentTime >= chapter.startTime &&
      currentTime < chapter.endTime,
  );

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
          if (stallTimerRef.current !== null) window.clearTimeout(stallTimerRef.current);
          stallTimerRef.current = null;
          telemetry("KairoVideo", "playing");
          setPlaying(true);
          partyEvents?.onPlay?.();
        }}
        onPause={() => {
          telemetry("KairoVideo", "pause");
          setPlaying(false);
          saveProgress("pause");
          partyEvents?.onPause?.();
        }}
        onWaiting={() => { telemetry("KairoVideo", "waiting"); setBuffering(true); startStallWatchdog("waiting"); }}
        onStalled={() => { telemetry("KairoVideo", "stalled"); startStallWatchdog("stalled"); }}
        onSuspend={() => telemetry("KairoVideo", "suspend")}
        onCanPlay={() => telemetry("KairoVideo", "canplay")}
        onPlaying={() => {
          setBuffering(false);
          setLoading(false);
        }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration);
          const restore = restoreRef.current;
          if (restore) {
            video.volume = restore.volume;
            video.muted = restore.muted;
            video.playbackRate = restore.playbackRate;
            video.currentTime = Math.min(restore.currentTime, video.duration || restore.currentTime);
            restoreRef.current = null;
            if (restore.playing) void video.play();
            return;
          }
          if (
            saved &&
            saved.currentTime > 5 &&
            saved.currentTime < video.duration - 30
          )
            video.currentTime = saved.currentTime;
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onSeeking={() => { telemetry("KairoVideo", "seeking"); setBuffering(true); }}
        onSeeked={() => { telemetry("KairoVideo", "seeked"); setBuffering(false); }}
        onError={() => telemetry("KairoVideo", "error")}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          setCurrentTime(time);
          partyEvents?.onTimeUpdate?.(time);
          if (Date.now() - lastSavedAtRef.current >= 20_000) saveProgress("interval");
        }}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onRateChange={(event) => {
          setSpeed(event.currentTarget.playbackRate);
          partyEvents?.onSpeedChange?.(event.currentTarget.playbackRate);
        }}
        onEnded={() => saveProgress("ended", true)}
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
                {fixedSources.map((candidate) => (
                  <button className={selectedDirectSource?.quality === candidate.quality ? styles.active : ""} key={candidate.quality} onClick={() => switchQuality(candidate.quality)} type="button">{candidate.quality}p</button>
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
          {document.pictureInPictureEnabled && <button aria-label={t.player.pip} onClick={() => void videoRef.current?.requestPictureInPicture?.()} type="button"><PictureInPicture /></button>}
          <button aria-label={fullscreen ? t.player.exitFullscreen : t.player.fullscreen} onClick={() => void toggleFullscreen()} type="button">
            {fullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
      {skippableChapter && (
        <button className={styles.skip} onClick={() => { if (videoRef.current) videoRef.current.currentTime = skippableChapter.endTime; }} type="button">
          {skippableChapter.type === "credits" ? "Пропустить титры" : t.player.skipIntro}
        </button>
      )}
    </div>
  );
}
