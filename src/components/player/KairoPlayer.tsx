"use client";

import {
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  Gauge,
  HelpCircle,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n";
import type { WatchEpisode } from "@/data/watch/types";
import type { PlayerProgress, QualityOption } from "./types";
import { useAccountData } from "@/components/data/AccountDataProvider";
import type { KodikPlayerHandle } from "./kodik/kodik-player.types";
import { setMediaPlaybackActive } from "./playback-activity";

type ShakaModule = typeof import("shaka-player/dist/shaka-player.compiled.js");
type ShakaPlayerInstance = InstanceType<ShakaModule["default"]["Player"]>;
type VariantTrack = ReturnType<ShakaPlayerInstance["getVariantTracks"]>[number];
type ShakaError = InstanceType<ShakaModule["default"]["util"]["Error"]>;
type PlayerStatus =
  | "idle"
  | "initializing"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "fatal-error";
type PlayerDiagnostic = {
  severity?: number;
  category?: number;
  code?: number;
  message?: string;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
};
const safePercent = (value: number, total: number) =>
  total > 0 && Number.isFinite(value) && Number.isFinite(total)
    ? Math.min(100, Math.max(0, (value / total) * 100))
    : 0;

export function KairoPlayer({
  episode,
  animeTitle,
  animePoster,
  previousHref,
  nextHref,
  seasonNumber = 1,
  onHandle,
  partyEvents,
  onPlaybackError,
}: {
  episode: WatchEpisode;
  animeTitle: string;
  animePoster?: string;
  previousHref?: string;
  nextHref?: string;
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
}) {
  const { locale, dictionary: t } = useLocale();
  const { progress, preferences, upsertProgress, updatePreferences } =
    useAccountData();
  const progressRef = useRef(progress);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    progressRef.current = progress;
    preferencesRef.current = preferences;
  }, [preferences, progress]);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ShakaPlayerInstance | null>(null);
  const shakaRef = useRef<ShakaModule["default"] | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const recoveryTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const retryPositionRef = useRef(0);
  const autoRetryUsedRef = useRef(false);
  const lastSaveRef = useRef(0);
  const idleSaveRef = useRef<number | null>(null);
  const lastNonZeroVolumeRef = useRef(1);
  useEffect(() => {
    lastSaveRef.current = Date.now();
  }, []);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<PlayerDiagnostic | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showBuffering, setShowBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<
    | "settings"
    | "quality"
    | "audio"
    | "subtitles"
    | "speed"
    | "episodes"
    | "shortcuts"
    | null
  >(null);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [qualityMode, setQualityMode] = useState<"auto" | "manual">("auto");
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [variantTracks, setVariantTracks] = useState<VariantTrack[]>([]);
  const [textTracks, setTextTracks] = useState<
    { id: number; language: string; label: string | null }[]
  >([]);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [selectedTextTrackId, setSelectedTextTrackId] = useState<number | null>(
    null,
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [resumeProgress, setResumeProgress] = useState<PlayerProgress | null>(
    null,
  );
  const rate = speeds.includes(preferences.playbackRate)
    ? preferences.playbackRate
    : 1;
  const autoplayNext = preferences.autoplayNext;
  const audioOptions = useMemo(
    () =>
      variantTracks.filter(
        (track, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.language === track.language &&
              candidate.audioId === track.audioId,
          ) === index,
      ),
    [variantTracks],
  );
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null,
  );
  const [timelinePreview, setTimelinePreview] = useState<{
    time: number;
    left: number;
  } | null>(null);
  const [nextPromptDismissed, setNextPromptDismissed] = useState(false);
  const playbackErrorRef = useRef(onPlaybackError);
  const partyEventsRef = useRef(partyEvents);
  useEffect(() => {
    playbackErrorRef.current = onPlaybackError;
    partyEventsRef.current = partyEvents;
  }, [onPlaybackError, partyEvents]);

  useEffect(() => {
    const handle: KodikPlayerHandle = {
      play: () => {
        const video = videoRef.current;
        if (!video) return false;
        void video.play();
        return true;
      },
      pause: () => {
        const video = videoRef.current;
        if (!video) return false;
        video.pause();
        return true;
      },
      seek: (seconds) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(seconds)) return false;
        video.currentTime = Math.max(
          0,
          Math.min(video.duration || Infinity, seconds),
        );
        return true;
      },
      setVolume: (value) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(value)) return false;
        video.volume = Math.max(0, Math.min(1, value));
        return true;
      },
      mute: () => {
        if (!videoRef.current) return false;
        videoRef.current.muted = true;
        return true;
      },
      unmute: () => {
        if (!videoRef.current) return false;
        videoRef.current.muted = false;
        return true;
      },
      setSpeed: (value) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(value) || value <= 0) return false;
        video.playbackRate = value;
        return true;
      },
      enterPip: () => {
        const video = videoRef.current;
        if (!video || !("requestPictureInPicture" in video)) return false;
        void video.requestPictureInPicture();
        return true;
      },
      exitPip: () => {
        if (!document.pictureInPictureElement) return false;
        void document.exitPictureInPicture();
        return true;
      },
      changeEpisode: () => false,
      getTime: () => Boolean(videoRef.current),
    };
    onHandle?.(handle);
    return () => onHandle?.(null);
  }, [onHandle]);
  const ready = ["ready", "playing", "paused", "buffering", "ended"].includes(
    status,
  );
  const loading =
    status === "idle" || status === "initializing" || status === "loading";
  const buffering = status === "buffering";
  const playing = status === "playing";
  const ended = status === "ended";
  const isMenuOpen = menu !== null;

  const source = episode.sources[0];
  const intro = useMemo(
    () => episode.chapters.find((chapter) => chapter.type === "intro"),
    [episode.chapters],
  );
  const showSkipIntro = Boolean(
    intro && currentTime >= intro.startTime && currentTime < intro.endTime,
  );
  const showNextPrompt = Boolean(
    nextHref &&
    duration > 0 &&
    duration - currentTime <= 25 &&
    !ended &&
    !nextPromptDismissed,
  );
  const autoNextVisible = Boolean((showNextPrompt || ended) && nextHref);
  const canHideControls =
    playing &&
    !buffering &&
    !isMenuOpen &&
    !isSeeking &&
    !resumeProgress &&
    !autoNextVisible;
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    if (!buffering) {
      const clearTimer = window.setTimeout(() => setShowBuffering(false), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const timer = window.setTimeout(() => setShowBuffering(true), 400);
    return () => window.clearTimeout(timer);
  }, [buffering]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.dataset.playerStatus = status;
  }, [status]);

  useEffect(() => {
    autoRetryUsedRef.current = false;
  }, [episode.animeSlug, episode.episodeNumber]);

  useEffect(
    () => () => {
      clearHideTimer();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (recoveryTimerRef.current)
        window.clearTimeout(recoveryTimerRef.current);
      sessionRef.current += 1;
    },
    [clearHideTimer],
  );

  const saveProgress = useCallback(
    (completed = false) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration)) return;
      upsertProgress({
        animeSlug: episode.animeSlug,
        seasonNumber,
        episodeNumber: episode.episodeNumber,
        currentTime: video.currentTime,
        duration: video.duration,
        updatedAt: new Date().toISOString(),
        completed: completed || video.currentTime / video.duration >= 0.93,
      });
      lastSaveRef.current = Date.now();
    },
    [episode.animeSlug, episode.episodeNumber, seasonNumber, upsertProgress],
  );
  const saveProgressRef = useRef(saveProgress);

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => () => saveProgressRef.current(), []);
  const scheduleProgressSave = useCallback(() => {
    if (idleSaveRef.current !== null) return;
    const commit = () => {
      idleSaveRef.current = null;
      saveProgressRef.current();
    };
    const requestIdle = (
      window as unknown as {
        requestIdleCallback?: typeof window.requestIdleCallback;
      }
    ).requestIdleCallback;
    if (requestIdle) {
      idleSaveRef.current = requestIdle(commit, {
        timeout: 5_000,
      });
      return;
    }
    idleSaveRef.current = window.setTimeout(commit, 1_000);
  }, []);
  useEffect(
    () => () => {
      if (idleSaveRef.current === null) return;
      const cancelIdle = (
        window as unknown as {
          cancelIdleCallback?: typeof window.cancelIdleCallback;
        }
      ).cancelIdleCallback;
      if (cancelIdle) cancelIdle(idleSaveRef.current);
      else window.clearTimeout(idleSaveRef.current);
      idleSaveRef.current = null;
    },
    [],
  );

  const scheduleControlsHide = useCallback(() => {
    clearHideTimer();
    if (!canHideControls) return;
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      hideTimerRef.current = null;
    }, 3000);
  }, [canHideControls, clearHideTimer]);

  const revealControls = useCallback(() => {
    setControlsVisible((current) => (current ? current : true));
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const keepControlsVisible = useCallback(() => {
    clearHideTimer();
    setControlsVisible((current) => (current ? current : true));
  }, [clearHideTimer]);

  useEffect(() => {
    clearHideTimer();
    if (canHideControls) scheduleControlsHide();
    return clearHideTimer;
  }, [canHideControls, clearHideTimer, scheduleControlsHide]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) {
      setFatalError(t.player.loadError);
      setStatus("fatal-error");
      playbackErrorRef.current?.();
      return;
    }
    const sessionId = ++sessionRef.current;
    let player: ShakaPlayerInstance | null = null;
    let shakaApi: ShakaModule["default"] | null = null;
    let nativePlayback = false;
    let loadCompleted = false;
    const isCurrent = () => sessionId === sessionRef.current;
    const clearRecovery = () => {
      if (recoveryTimerRef.current) {
        window.clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
    const logDiagnostic = (label: string, detail?: ShakaError) => {
      if (process.env.NODE_ENV !== "development") return;
      console.debug(`[Kairo player] ${label}`, {
        sourceType: source.type,
        hostname: new URL(source.url, window.location.href).hostname,
        category: detail?.category,
        code: detail?.code,
        severity: detail?.severity,
        status: video.dataset.playerStatus,
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        paused: video.paused,
      });
    };
    const markRecovered = () => {
      if (!isCurrent() || !loadCompleted) return;
      clearRecovery();
      setFatalError(null);
      setDiagnostic(null);
      setStatus(video.paused ? "paused" : "playing");
      showToast(t.player.restored);
    };
    const onShakaError = (event: Event) => {
      if (!isCurrent()) return;
      const detail = (event as CustomEvent<ShakaError>).detail;
      if (!detail) return;
      setDiagnostic({
        severity: detail.severity,
        category: detail.category,
        code: detail.code,
      });
      logDiagnostic("Shaka error", detail);
      if (!shakaApi) return;
      const isAuxiliary =
        detail.category === shakaApi.util.Error.Category.TEXT ||
        detail.category === shakaApi.util.Error.Category.ADS ||
        detail.category === shakaApi.util.Error.Category.CAST;
      const isRecoverable =
        detail.severity === shakaApi.util.Error.Severity.RECOVERABLE;
      if (isAuxiliary) {
        if (detail.category === shakaApi.util.Error.Category.TEXT)
          showToast(t.player.subtitlesFailed);
        return;
      }
      if (isRecoverable || (loadCompleted && video.readyState >= 2)) {
        setStatus("buffering");
        showToast(t.player.reconnecting);
        clearRecovery();
        recoveryTimerRef.current = window.setTimeout(() => {
          if (!isCurrent()) return;
          if (video.readyState >= 3 || (!video.paused && !video.error)) {
            markRecovered();
            return;
          }
          if (autoRetryUsedRef.current) {
            setFatalError(t.player.loadError);
            setStatus("fatal-error");
            playbackErrorRef.current?.();
            return;
          }
          autoRetryUsedRef.current = true;
          retryPositionRef.current = video.currentTime;
          setRetryNonce((value) => value + 1);
        }, 8000);
        return;
      }
      setFatalError(
        navigator.onLine ? t.player.loadError : t.player.connectionLost,
      );
      setStatus("fatal-error");
      playbackErrorRef.current?.();
    };
    const initialize = async () => {
      try {
        setMenu(null);
        clearHideTimer();
        setAutoNextCountdown(null);
        setNextPromptDismissed(false);
        setQualities([]);
        setVariantTracks([]);
        setActiveHeight(null);
        setTextTracks([]);
        setSelectedTextTrackId(null);
        setSubtitleVisible(false);
        setStatus("initializing");
        setFatalError(null);
        if (source.type === "mp4") {
          nativePlayback = true;
          playerRef.current = null;
          shakaRef.current = null;
          setStatus("loading");
          video.src = source.url;
          video.load();
          loadCompleted = true;
          logDiagnostic("Native MP4 load started");
          const migrated = progressRef.current.find(
            (entry) =>
              entry.animeSlug === episode.animeSlug &&
              entry.seasonNumber === seasonNumber &&
              entry.episodeNumber === episode.episodeNumber,
          );
          if (migrated && !migrated.completed && migrated.currentTime > 5)
            setResumeProgress({
              animeSlug: migrated.animeSlug,
              episode: migrated.episodeNumber,
              currentTime: migrated.currentTime,
              duration: migrated.duration,
              completed: migrated.completed,
              updatedAt: migrated.updatedAt,
            });
          return;
        }
        const imported =
          await import("shaka-player/dist/shaka-player.compiled.js");
        const shaka = imported.default;
        shakaApi = shaka;
        shakaRef.current = shaka;
        if (!isCurrent()) return;
        if (!shaka.Player.isBrowserSupported()) {
          throw new Error("unsupported-browser");
        }
        player = new shaka.Player();
        playerRef.current = player;
        player.addEventListener("error", onShakaError);
        const networkRetry = {
          maxAttempts: 5,
          baseDelay: 750,
          backoffFactor: 1.8,
          fuzzFactor: 0.5,
          timeout: 15_000,
        };
        player.configure({
          abr: {
            // Kodik renditions share six-second MPEG-TS boundaries. Avoid
            // switching on every bandwidth sample, which can repeatedly
            // reinitialize the decoder at those boundaries.
            switchInterval: 20,
            minTimeToSwitch: 12,
            bandwidthUpgradeTarget: 0.7,
            bandwidthDowngradeTarget: 0.95,
            clearBufferSwitch: false,
            safeMarginSwitch: 8,
            droppedFrames: true,
          },
          manifest: { retryParameters: networkRetry },
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 6,
            bufferBehind: 30,
            segmentPrefetchLimit: 2,
            gapDetectionThreshold: 0.25,
            gapJumpTimerTime: 0.1,
            gapPadding: 0.01,
            stallEnabled: true,
            stallThreshold: 0.75,
            stallSkip: 0.12,
            shouldFixTimestampOffset: true,
            retryParameters: networkRetry,
          },
        });
        const syncVariantState = () => {
          if (!player || !isCurrent()) return;
          const tracks = player.getVariantTracks();
          setVariantTracks(tracks);
          const active = tracks.find((track) => track.active);
          setActiveHeight(
            active?.height && active.height > 0 ? active.height : null,
          );
        };
        player.addEventListener("adaptation", syncVariantState);
        player.addEventListener("variantchanged", syncVariantState);
        player.addEventListener("buffering", (event) => {
          if (!isCurrent()) return;
          const active = Boolean(
            (event as Event & { buffering?: boolean }).buffering,
          );
          if (active) setStatus("buffering");
          else setStatus(video.paused ? "paused" : "playing");
        });
        player.addEventListener("textchanged", () => {
          if (!player || !isCurrent()) return;
          const tracks = player.getTextTracks();
          const active = tracks.find((track) => track.active) ?? null;
          setTextTracks(tracks);
          setSelectedTextTrackId(active?.id ?? null);
          setSubtitleVisible(Boolean(active));
        });
        await player.attach(video);
        if (!isCurrent()) return;
        setStatus("loading");
        await player.load(source.url);
        if (!isCurrent()) return;
        loadCompleted = true;
        setFatalError(null);
        setDiagnostic(null);
        setStatus("ready");
        for (const subtitle of episode.subtitles) {
          try {
            await player.addTextTrackAsync(
              subtitle.url,
              subtitle.language,
              subtitle.kind,
              "text/vtt",
              undefined,
              subtitle.label,
            );
          } catch (subtitleError) {
            if (isCurrent()) {
              showToast(t.player.subtitlesFailed);
              logDiagnostic(
                subtitleError instanceof Error
                  ? subtitleError.message
                  : "Subtitle track failed",
              );
            }
          }
        }
        if (!isCurrent()) return;
        const variants = player.getVariantTracks();
        setVariantTracks(variants);
        const uniqueQualities = new Map<number, QualityOption>();
        variants.forEach((track) => {
          if (track.height && track.height > 0) {
            const existing = uniqueQualities.get(track.height);
            if (!existing || (track.bandwidth ?? 0) > (existing.bandwidth ?? 0))
              uniqueQualities.set(track.height, {
                height: track.height,
                width: track.width && track.width > 0 ? track.width : null,
                bandwidth:
                  track.bandwidth && track.bandwidth > 0
                    ? track.bandwidth
                    : null,
              });
          }
        });
        const normalizedQualities = [...uniqueQualities.values()].sort(
          (a, b) => a.height - b.height,
        );
        setQualities(normalizedQualities);
        const qualityPreference = preferencesRef.current.preferredQualityMode;
        if (
          typeof qualityPreference === "number" &&
          normalizedQualities.length
        ) {
          const closest = normalizedQualities.reduce((best, candidate) =>
            Math.abs(candidate.height - qualityPreference) <
            Math.abs(best.height - qualityPreference)
              ? candidate
              : best,
          );
          const preferredVariant =
            variants
              .filter((track) => track.height === closest.height)
              .sort(
                (a, b) =>
                  Number(
                    b.language ===
                      preferencesRef.current.preferredAudioLanguage,
                  ) -
                  Number(
                    a.language ===
                      preferencesRef.current.preferredAudioLanguage,
                  ),
              )[0] ?? null;
          if (preferredVariant) {
            player.configure({ abr: { enabled: false } });
            player.selectVariantTrack(preferredVariant, true);
            setQualityMode("manual");
          }
        } else {
          player.configure({ abr: { enabled: true } });
          setQualityMode("auto");
        }
        syncVariantState();
        const availableTextTracks = player.getTextTracks();
        setTextTracks(availableTextTracks);
        const preferredTrack = availableTextTracks.find(
          (track) => track.language === preferencesRef.current.subtitleLanguage,
        );
        if (preferredTrack && preferencesRef.current.subtitlesEnabled) {
          player.selectTextTrack(preferredTrack);
          setSubtitleVisible(true);
          setSelectedTextTrackId(preferredTrack.id);
        } else {
          player.selectTextTrack(null);
          setSubtitleVisible(false);
          setSelectedTextTrackId(null);
        }
        if (retryPositionRef.current > 0) {
          video.currentTime = Math.min(
            retryPositionRef.current,
            video.duration || retryPositionRef.current,
          );
          retryPositionRef.current = 0;
          await video.play().catch(() => undefined);
        }
        const migrated = progressRef.current.find(
          (entry) =>
            entry.animeSlug === episode.animeSlug &&
            entry.seasonNumber === seasonNumber &&
            entry.episodeNumber === episode.episodeNumber,
        );
        const saved: PlayerProgress | null = migrated
          ? {
              animeSlug: migrated.animeSlug,
              episode: migrated.episodeNumber,
              currentTime: migrated.currentTime,
              duration: migrated.duration,
              completed: migrated.completed,
              updatedAt: migrated.updatedAt,
            }
          : null;
        if (
          saved &&
          !saved.completed &&
          saved.currentTime > 5 &&
          (!saved.duration || saved.currentTime < saved.duration - 15)
        )
          setResumeProgress(saved);
      } catch (reason) {
        if (!isCurrent()) return;
        logDiagnostic(
          reason instanceof Error ? reason.message : "Initialization failed",
          shakaApi && reason instanceof shakaApi.util.Error
            ? reason
            : undefined,
        );
        setFatalError(
          navigator.onLine ? t.player.loadError : t.player.connectionLost,
        );
        setStatus("fatal-error");
        playbackErrorRef.current?.("fatal");
      }
    };
    void initialize();
    return () => {
      if (sessionRef.current === sessionId) sessionRef.current += 1;
      clearRecovery();
      if (player) {
        player.removeEventListener("error", onShakaError);
        void player.destroy().catch(() => undefined);
      }
      if (playerRef.current === player) playerRef.current = null;
      if (shakaRef.current === shakaApi) shakaRef.current = null;
      if (nativePlayback) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [
    episode.animeSlug,
    episode.episodeNumber,
    seasonNumber,
    episode.subtitles,
    clearHideTimer,
    retryNonce,
    showToast,
    source,
    t.player.connectionLost,
    t.player.loadError,
    t.player.reconnecting,
    t.player.restored,
    t.player.subtitlesFailed,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stallPosition = video.currentTime;
    let lastProgressAt = Date.now();
    let stallEscalated = false;
    const resetStallWatchdog = () => {
      stallPosition = video.currentTime;
      lastProgressAt = Date.now();
      stallEscalated = false;
    };
    const stallWatchdog = window.setInterval(() => {
      if (video.paused || video.ended) {
        resetStallWatchdog();
        return;
      }
      if (Math.abs(video.currentTime - stallPosition) >= 0.5) {
        resetStallWatchdog();
        return;
      }
      if (!stallEscalated && Date.now() - lastProgressAt >= 12_000) {
        stallEscalated = true;
        showToast(t.player.reconnecting);
        playbackErrorRef.current?.("stall");
      }
    }, 2_000);
    const onTime = () => {
      setCurrentTime(video.currentTime);
      partyEventsRef.current?.onTimeUpdate?.(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      const end = video.buffered.length
        ? video.buffered.end(video.buffered.length - 1)
        : 0;
      setBuffered(end);
      if (Date.now() - lastSaveRef.current > 20_000) scheduleProgressSave();
    };
    const onPlay = () => {
      setMediaPlaybackActive(video, true);
      resetStallWatchdog();
      setStatus("playing");
      setFatalError(null);
      setDiagnostic(null);
      if (recoveryTimerRef.current) {
        window.clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      partyEventsRef.current?.onPlay?.();
    };
    const onPlaying = () => {
      setMediaPlaybackActive(video, true);
      resetStallWatchdog();
    };
    const onPause = () => {
      resetStallWatchdog();
      setMediaPlaybackActive(video, false);
      if (!video.ended) setStatus("paused");
      keepControlsVisible();
      saveProgress();
      partyEventsRef.current?.onPause?.();
    };
    const onEnded = () => {
      resetStallWatchdog();
      setMediaPlaybackActive(video, false);
      setStatus("ended");
      setFatalError(null);
      saveProgress(true);
      if (autoplayNext && nextHref) setAutoNextCountdown(5);
    };
    const onCanPlay = () => {
      setMediaPlaybackActive(video, !video.paused && !video.ended);
      setFatalError(null);
      setDiagnostic(null);
      setStatus(video.paused ? "paused" : "playing");
      if (recoveryTimerRef.current) {
        window.clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
    const onWaiting = () => {
      if (!video.paused && !video.ended) {
        setStatus("buffering");
      }
    };
    const onMediaError = () => {
      const mediaError = video.error;
      if (!mediaError || mediaError.code === MediaError.MEDIA_ERR_ABORTED)
        return;
      setDiagnostic({
        category: shakaRef.current?.util.Error.Category.MEDIA,
        code: mediaError.code,
        message: mediaError.message,
      });
      if (process.env.NODE_ENV === "development") {
        console.error("[Kairo player] Native media error", {
          sourceType: source?.type,
          code: mediaError.code,
          message: mediaError.message,
          networkState: video.networkState,
          readyState: video.readyState,
        });
      }
      if (source?.type === "mp4") {
        setFatalError(t.player.loadError);
        setStatus("fatal-error");
        playbackErrorRef.current?.();
        return;
      }
      if (mediaError.code === MediaError.MEDIA_ERR_NETWORK) {
        setStatus("buffering");
        showToast(t.player.reconnecting);
        return;
      }
      setFatalError(t.player.loadError);
      setStatus("fatal-error");
      playbackErrorRef.current?.();
    };
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      if (!video.muted && video.volume > 0)
        lastNonZeroVolumeRef.current = video.volume;
    };
    const onSeeked = () => partyEventsRef.current?.onSeek?.(video.currentTime);
    const onRateChange = () =>
      partyEventsRef.current?.onSpeedChange?.(video.playbackRate);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("loadedmetadata", onCanPlay);
    video.addEventListener("loadeddata", onCanPlay);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onMediaError);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ratechange", onRateChange);
    return () => {
      window.clearInterval(stallWatchdog);
      setMediaPlaybackActive(video, false);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("loadedmetadata", onCanPlay);
      video.removeEventListener("loadeddata", onCanPlay);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onMediaError);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ratechange", onRateChange);
    };
  }, [
    autoplayNext,
    keepControlsVisible,
    nextHref,
    router,
    saveProgress,
    scheduleProgressSave,
    showToast,
    source?.type,
    t.player.loadError,
    t.player.reconnecting,
  ]);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const supported =
        "pictureInPictureEnabled" in document &&
        Boolean(document.pictureInPictureEnabled);
      setPipSupported((current) =>
        current === supported ? current : supported,
      );
    }, 0);
    const video = videoRef.current;
    const onFullscreen = () => {
      setFullscreen((current) => {
        const next = Boolean(document.fullscreenElement);
        return current === next ? current : next;
      });
      setMenu(null);
    };
    const onEnterPip = () => setPipActive(true);
    const onLeavePip = () => setPipActive(false);
    document.addEventListener("fullscreenchange", onFullscreen);
    video?.addEventListener("enterpictureinpicture", onEnterPip);
    video?.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      window.clearTimeout(hydrateTimer);
      document.removeEventListener("fullscreenchange", onFullscreen);
      video?.removeEventListener("enterpictureinpicture", onEnterPip);
      video?.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, []);

  useEffect(() => {
    const onPageHide = () => saveProgress();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveProgress();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [saveProgress]);

  useEffect(() => {
    if (autoNextCountdown === null || !nextHref) return;
    if (autoNextCountdown <= 0) {
      saveProgress(true);
      router.push(nextHref);
      return;
    }
    const timer = window.setTimeout(
      () =>
        setAutoNextCountdown((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [autoNextCountdown, nextHref, router, saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && ready) video.playbackRate = rate;
  }, [rate, ready]);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (video)
      video.currentTime = Math.max(
        0,
        Math.min(video.duration || Infinity, video.currentTime + amount),
      );
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: locale === "ru" ? episode.titleRu : episode.titleEn,
      artist: animeTitle,
      album: `${t.labels.episode} ${episode.episodeNumber}`,
      artwork: animePoster ? [{ src: animePoster }] : [],
    });
    navigator.mediaSession.setActionHandler(
      "play",
      () => void videoRef.current?.play(),
    );
    navigator.mediaSession.setActionHandler("pause", () =>
      videoRef.current?.pause(),
    );
    navigator.mediaSession.setActionHandler("seekbackward", () => seekBy(-10));
    navigator.mediaSession.setActionHandler("seekforward", () => seekBy(10));
    return () => {
      ["play", "pause", "seekbackward", "seekforward"].forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            null,
          );
        } catch {}
      });
    };
  }, [animePoster, animeTitle, episode, locale, seekBy, t.labels.episode]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };
  const finishMenuSelection = () => {
    setMenu(null);
    revealControls();
  };
  const selectQuality = (height?: number) => {
    const player = playerRef.current;
    if (!player) return;
    if (!height) {
      player.configure({ abr: { enabled: true } });
      setQualityMode("auto");
      updatePreferences({
        ...preferences,
        preferredQualityMode: "auto",
      });
      const active = player.getVariantTracks().find((track) => track.active);
      setActiveHeight(
        active?.height && active.height > 0 ? active.height : null,
      );
      finishMenuSelection();
      return;
    }
    const tracks = player.getVariantTracks();
    const track =
      tracks.find(
        (item) =>
          item.height === height &&
          item.language === preferences.preferredAudioLanguage,
      ) ?? tracks.find((item) => item.height === height);
    if (track) {
      player.configure({ abr: { enabled: false } });
      player.selectVariantTrack(track, true);
      const active = player.getVariantTracks().find((item) => item.active);
      setQualityMode("manual");
      setActiveHeight(
        active?.height && active.height > 0 ? active.height : height,
      );
      setVariantTracks(player.getVariantTracks());
      updatePreferences({
        ...preferences,
        preferredQualityMode: height,
      });
      finishMenuSelection();
    }
  };
  const selectAudio = (track: VariantTrack) => {
    const player = playerRef.current;
    if (!player) return;
    const tracks = player.getVariantTracks();
    const targetHeight =
      qualityMode === "manual"
        ? typeof preferences.preferredQualityMode === "number"
          ? preferences.preferredQualityMode
          : activeHeight
        : activeHeight;
    const sameLanguage = tracks.filter(
      (item) =>
        item.language === track.language && item.audioId === track.audioId,
    );
    const selected =
      sameLanguage.reduce<VariantTrack | null>((best, candidate) => {
        if (!best) return candidate;
        if (!targetHeight)
          return candidate.bandwidth > best.bandwidth ? candidate : best;
        return Math.abs((candidate.height ?? 0) - targetHeight) <
          Math.abs((best.height ?? 0) - targetHeight)
          ? candidate
          : best;
      }, null) ?? track;
    player.selectVariantTrack(selected, true);
    if (qualityMode === "auto") player.configure({ abr: { enabled: true } });
    setVariantTracks(player.getVariantTracks());
    updatePreferences({
      ...preferences,
      preferredAudioLanguage: track.language,
    });
    finishMenuSelection();
  };
  const disableSubtitles = () => {
    playerRef.current?.selectTextTrack(null);
    setSubtitleVisible(false);
    setSelectedTextTrackId(null);
    updatePreferences({
      ...preferences,
      subtitlesEnabled: false,
    });
    finishMenuSelection();
  };
  const selectSubtitles = (trackId: number) => {
    const player = playerRef.current;
    const selected = player
      ?.getTextTracks()
      .find((item) => item.id === trackId);
    if (!player || !selected) return;
    player.selectTextTrack(selected);
    setSubtitleVisible(true);
    setSelectedTextTrackId(selected.id);
    updatePreferences({
      ...preferences,
      subtitlesEnabled: true,
      subtitleLanguage: selected.language,
    });
    finishMenuSelection();
  };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current?.requestFullscreen();
  };
  const togglePip = async () => {
    const video = videoRef.current;
    if (!video || !pipSupported) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const key = event.key.toLowerCase();
      if (key === "escape" && menu) {
        event.preventDefault();
        setMenu(null);
        revealControls();
        return;
      }
      if (
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      if (
        [
          " ",
          "k",
          "arrowleft",
          "arrowright",
          "j",
          "l",
          "m",
          "f",
          "p",
          "c",
          "arrowup",
          "arrowdown",
          "?",
          "escape",
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
        ].includes(key)
      )
        event.preventDefault();
      if (key === " " || key === "k") togglePlay();
      else if (key === "arrowleft") seekBy(-5);
      else if (key === "arrowright") seekBy(5);
      else if (key === "j") seekBy(-10);
      else if (key === "l") seekBy(10);
      else if (key === "m" && videoRef.current)
        if (videoRef.current.muted || videoRef.current.volume === 0) {
          videoRef.current.volume = lastNonZeroVolumeRef.current;
          videoRef.current.muted = false;
        } else videoRef.current.muted = true;
      else if (key === "f") void toggleFullscreen();
      else if (key === "p") void togglePip();
      else if (key === "c" && playerRef.current) {
        const tracks = playerRef.current.getTextTracks();
        const visible =
          !tracks.some((track) => track.active) && tracks.length > 0;
        if (visible) {
          const selected =
            tracks.find((track) => track.id === selectedTextTrackId) ??
            tracks.find(
              (track) => track.language === preferences.subtitleLanguage,
            ) ??
            tracks[0];
          playerRef.current.selectTextTrack(selected);
          setSelectedTextTrackId(selected.id);
          updatePreferences({
            ...preferences,
            subtitlesEnabled: true,
            subtitleLanguage: selected.language,
          });
        } else {
          updatePreferences({ ...preferences, subtitlesEnabled: false });
        }
        if (!visible) playerRef.current.selectTextTrack(null);
        setSubtitleVisible(visible);
      } else if (key === "arrowup" && videoRef.current)
        videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.05);
      else if (key === "arrowdown" && videoRef.current)
        videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.05);
      else if (/^[0-9]$/.test(key) && videoRef.current?.duration)
        videoRef.current.currentTime =
          videoRef.current.duration * (Number(key) / 10);
      else if (key === "?") setMenu("shortcuts");
      revealControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className={`kairo-player ${controlsVisible ? "controls-visible" : "controls-hidden"} ${playing ? "is-playing" : ""}`}
      data-controls-visible={controlsVisible}
      data-diagnostic-code={
        process.env.NODE_ENV === "development" ? diagnostic?.code : undefined
      }
      ref={shellRef}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onMouseLeave={scheduleControlsHide}
      onClick={(event) => {
        if (event.target === event.currentTarget) revealControls();
      }}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        controls={false}
        crossOrigin="anonymous"
        poster={animePoster}
        aria-label={
          source?.isDemo ? `${t.player.demoVideo}: ${animeTitle}` : animeTitle
        }
        onClick={() => {
          revealControls();
          togglePlay();
        }}
        onDoubleClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - bounds.left) / bounds.width;
          if (ratio < 0.34) seekBy(-10);
          else if (ratio > 0.66) seekBy(10);
          else void toggleFullscreen();
          revealControls();
        }}
      >
        {source?.type === "mp4" &&
          episode.subtitles.map((subtitle) => (
            <track
              default={subtitle.isDefault}
              key={subtitle.id}
              kind="subtitles"
              label={subtitle.label}
              src={subtitle.url}
              srcLang={subtitle.language}
            />
          ))}
      </video>
      {source?.isDemo && (
        <div className="player-demo-badge">{t.player.demoVideo}</div>
      )}
      {(loading || showBuffering) && (
        <div className="player-loading">
          <i />
          <p>{loading ? t.player.preparing : t.player.reconnecting}</p>
        </div>
      )}
      {status === "fatal-error" && fatalError && (
        <div className="player-error">
          <p>{fatalError}</p>
          <div>
            <button
              className="button button-primary"
              onClick={() => {
                retryPositionRef.current = videoRef.current?.currentTime ?? 0;
                setFatalError(null);
                setDiagnostic(null);
                setStatus("loading");
                setRetryNonce((value) => value + 1);
              }}
            >
              {t.player.retry}
            </button>
            <Link
              className="button button-secondary"
              href={`/anime/${episode.animeSlug}`}
            >
              {t.player.backToAnime}
            </Link>
          </div>
        </div>
      )}
      {toast && (
        <div className="player-toast" role="status">
          {toast}
        </div>
      )}
      {resumeProgress && (
        <div className="resume-prompt">
          <p>
            {resumeProgress.completed
              ? t.player.ended
              : `${t.player.continueFrom} ${formatTime(resumeProgress.currentTime)}`}
          </p>
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
              setResumeProgress(null);
            }}
          >
            {t.player.restart}
          </button>
          <button
            onClick={() => {
              if (videoRef.current)
                videoRef.current.currentTime = resumeProgress.currentTime;
              setResumeProgress(null);
            }}
          >
            {t.player.resume}
          </button>
        </div>
      )}
      {showSkipIntro && intro && (
        <button
          className="skip-intro"
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = intro.endTime;
          }}
        >
          {t.player.skipIntro}
        </button>
      )}
      {(showNextPrompt || ended) && nextHref && (
        <div className="next-episode-prompt">
          <p aria-live="polite">
            {autoNextCountdown !== null
              ? `${t.player.nextStartsIn} ${autoNextCountdown}`
              : ended
                ? t.player.ended
                : t.player.nextEpisode}
          </p>
          <Link href={nextHref} onClick={() => saveProgress(ended)}>
            {t.player.watchNow}
          </Link>
          <button
            onClick={() => {
              if (status === "ended") setStatus("paused");
              setAutoNextCountdown(null);
              setNextPromptDismissed(true);
            }}
          >
            {t.player.cancel}
          </button>
        </div>
      )}
      <div className="player-controls" onFocusCapture={revealControls}>
        <div className="timeline-wrap">
          <div
            className="timeline-buffered"
            style={{ width: `${safePercent(buffered, duration)}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            aria-label={t.labels.duration}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            onPointerDown={() => {
              setIsSeeking(true);
              keepControlsVisible();
            }}
            onPointerUp={() => {
              setIsSeeking(false);
              revealControls();
            }}
            onChange={(event) => {
              if (videoRef.current)
                videoRef.current.currentTime = Number(event.target.value);
            }}
            onPointerLeave={() => setTimelinePreview(null)}
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = Math.max(
                0,
                Math.min(1, (event.clientX - bounds.left) / bounds.width),
              );
              setTimelinePreview({
                time: ratio * duration,
                left: ratio * 100,
              });
            }}
            style={
              {
                "--progress": `${safePercent(currentTime, duration)}%`,
              } as React.CSSProperties
            }
          />
          {timelinePreview && (
            <output
              className="timeline-preview"
              style={{ left: `${timelinePreview.left}%` }}
            >
              {formatTime(timelinePreview.time)}
            </output>
          )}
          <div className="timeline-chapters">
            {episode.chapters.map((chapter) => (
              <i
                key={chapter.id}
                title={chapter.title}
                style={{
                  left: `${safePercent(chapter.startTime, duration)}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="controls-row">
          <button
            onClick={togglePlay}
            aria-label={playing ? t.player.pause : t.player.play}
            title={playing ? t.player.pause : t.player.play}
          >
            {playing ? <Pause /> : <Play fill="currentColor" />}
          </button>
          <button
            onClick={() => seekBy(-10)}
            aria-label={t.player.back10}
            title={t.player.back10}
          >
            <RotateCcw />
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label={t.player.forward10}
            title={t.player.forward10}
          >
            <RotateCw />
          </button>
          <button
            onClick={() => {
              if (!videoRef.current) return;
              if (videoRef.current.muted || videoRef.current.volume === 0) {
                videoRef.current.volume = lastNonZeroVolumeRef.current;
                videoRef.current.muted = false;
              } else videoRef.current.muted = true;
            }}
            aria-label={muted || volume === 0 ? t.player.unmute : t.player.mute}
            aria-pressed={muted || volume === 0}
            title={muted || volume === 0 ? t.player.unmute : t.player.mute}
          >
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </button>
          <input
            className="volume-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label={t.player.volume}
            onPointerDown={() => {
              setIsSeeking(true);
              keepControlsVisible();
            }}
            onPointerUp={() => {
              setIsSeeking(false);
              revealControls();
            }}
            onChange={(event) => {
              if (videoRef.current) {
                videoRef.current.volume = Number(event.target.value);
                videoRef.current.muted = false;
              }
            }}
          />
          <span className="player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="controls-spacer" />
          <button
            onClick={() =>
              setMenu((current) => (current === "episodes" ? null : "episodes"))
            }
            aria-label={t.player.episodeList}
            aria-expanded={menu === "episodes"}
            title={t.player.episodeList}
          >
            <ListVideo />
          </button>
          <button
            onClick={() =>
              textTracks.length
                ? setMenu((current) =>
                    current === "subtitles" ? null : "subtitles",
                  )
                : showToast(t.player.subtitlesUnavailable)
            }
            aria-label={t.player.subtitles}
            aria-expanded={menu === "subtitles"}
            aria-pressed={subtitleVisible}
            title={t.player.subtitles}
          >
            <Captions />
          </button>
          <button
            onClick={() => setMenu((current) => (current ? null : "settings"))}
            aria-label={t.player.settings}
            aria-expanded={menu !== null}
            aria-controls="kairo-player-menu"
            title={t.player.settings}
          >
            <Settings />
          </button>
          {pipSupported && (
            <button
              onClick={() => void togglePip()}
              aria-label={t.player.pip}
              aria-pressed={pipActive}
              title={t.player.pip}
            >
              <PictureInPicture />
            </button>
          )}
          <button
            onClick={() => void toggleFullscreen()}
            aria-label={
              fullscreen ? t.player.exitFullscreen : t.player.fullscreen
            }
            title={fullscreen ? t.player.exitFullscreen : t.player.fullscreen}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
      {menu && (
        <>
          <button
            aria-label={t.player.close}
            className="player-menu-backdrop"
            onClick={() => {
              setMenu(null);
              revealControls();
            }}
          />
          <div className="player-menu" id="kairo-player-menu">
            <div className="player-menu-head">
              <strong>
                {menu === "quality"
                  ? t.player.quality
                  : menu === "audio"
                    ? t.player.audio
                    : menu === "subtitles"
                      ? t.player.subtitles
                      : menu === "speed"
                        ? t.player.speed
                        : menu === "episodes"
                          ? t.player.episodeList
                          : menu === "shortcuts"
                            ? t.player.shortcuts
                            : t.player.settings}
              </strong>
              <button
                onClick={() => {
                  setMenu(null);
                  revealControls();
                }}
                aria-label={t.player.close}
              >
                <X />
              </button>
            </div>
            {menu === "settings" && (
              <>
                <button onClick={() => setMenu("quality")}>
                  <Expand />
                  {t.player.quality}
                  <span>
                    {qualityMode === "auto"
                      ? activeHeight
                        ? `${t.player.auto} · ${activeHeight}p`
                        : t.player.auto
                      : activeHeight
                        ? `${activeHeight}p`
                        : typeof preferences.preferredQualityMode === "number"
                          ? `${preferences.preferredQualityMode}p`
                          : t.player.auto}
                  </span>
                </button>
                {audioOptions.length > 1 && (
                  <button onClick={() => setMenu("audio")}>
                    <Volume2 />
                    {t.player.audio}
                  </button>
                )}
                <button onClick={() => setMenu("speed")}>
                  <Gauge />
                  {t.player.speed}
                  <span>{rate}×</span>
                </button>
                <button onClick={() => setMenu("shortcuts")}>
                  <HelpCircle />
                  {t.player.shortcuts}
                </button>
                <label className="autoplay-setting">
                  <input
                    type="checkbox"
                    checked={autoplayNext}
                    onChange={(event) => {
                      updatePreferences({
                        ...preferences,
                        autoplayNext: event.target.checked,
                      });
                    }}
                  />
                  {t.player.autoplayNext}
                </label>
              </>
            )}
            {menu === "quality" && (
              <>
                <button
                  onClick={() => selectQuality()}
                  className={qualityMode === "auto" ? "active" : ""}
                >
                  {t.player.auto}
                  {qualityMode === "auto" && <Check aria-hidden="true" />}
                </button>
                {qualities.map((quality) => (
                  <button
                    key={quality.height}
                    onClick={() => selectQuality(quality.height)}
                    className={
                      qualityMode === "manual" &&
                      preferences.preferredQualityMode === quality.height
                        ? "active"
                        : ""
                    }
                  >
                    {quality.height}p
                    {qualityMode === "manual" &&
                      preferences.preferredQualityMode === quality.height && (
                        <Check aria-hidden="true" />
                      )}
                  </button>
                ))}
              </>
            )}
            {menu === "audio" &&
              audioOptions.map((track) => (
                <button
                  key={`${track.language}-${track.audioId}`}
                  onClick={() => selectAudio(track)}
                  className={
                    track.language === preferences.preferredAudioLanguage
                      ? "active"
                      : ""
                  }
                >
                  {episode.audioTracks.find(
                    (item) => item.language === track.language,
                  )?.label ??
                    track.label ??
                    track.language}
                </button>
              ))}
            {menu === "subtitles" && (
              <>
                <button
                  onClick={disableSubtitles}
                  className={!subtitleVisible ? "active" : ""}
                >
                  {t.player.off}
                  {!subtitleVisible && <Check aria-hidden="true" />}
                </button>
                {textTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => selectSubtitles(track.id)}
                    className={
                      subtitleVisible && selectedTextTrackId === track.id
                        ? "active"
                        : ""
                    }
                  >
                    {track.label ?? track.language}
                    {subtitleVisible && selectedTextTrackId === track.id && (
                      <Check aria-hidden="true" />
                    )}
                  </button>
                ))}
              </>
            )}
            {menu === "speed" &&
              speeds.map((value) => (
                <button
                  key={value}
                  className={rate === value ? "active" : ""}
                  onClick={() => {
                    updatePreferences({
                      ...preferences,
                      playbackRate: value,
                    });
                    if (videoRef.current) videoRef.current.playbackRate = value;
                    finishMenuSelection();
                  }}
                >
                  {value}×
                </button>
              ))}
            {menu === "episodes" && (
              <div className="episode-links">
                {previousHref ? (
                  <Link href={previousHref} onClick={() => saveProgress()}>
                    <ChevronLeft />
                    {t.player.previousEpisode}
                  </Link>
                ) : (
                  <span />
                )}
                {nextHref && (
                  <Link href={nextHref} onClick={() => saveProgress()}>
                    {t.player.nextEpisode}
                    <ChevronRight />
                  </Link>
                )}
              </div>
            )}
            {menu === "shortcuts" && (
              <dl className="shortcuts-list">
                <div>
                  <dt>Space / K</dt>
                  <dd>
                    {t.player.play} / {t.player.pause}
                  </dd>
                </div>
                <div>
                  <dt>J / L</dt>
                  <dd>
                    {t.player.back10} / {t.player.forward10}
                  </dd>
                </div>
                <div>
                  <dt>M · F · P · C</dt>
                  <dd>
                    {t.player.mute} · {t.player.fullscreen} · PiP ·{" "}
                    {t.player.subtitles}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </>
      )}
      {source?.isDemo && (
        <p className="player-demo-notice">{t.player.demoNotice}</p>
      )}
    </div>
  );
}
