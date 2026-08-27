"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type HlsType from "hls.js";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  LoaderCircle,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  PlaybackDescriptor,
  PlaybackProtocol,
  PlaybackSource,
} from "@/lib/playback/descriptor";
import {
  chooseHlsPlaybackMode,
  isSafariBrowser,
  type HlsPlaybackMode,
} from "@/lib/playback/hls-policy";
import { activeSkipSegment, skipTarget } from "@/lib/playback/skip-segments";
import { formatPlaybackTime } from "@/lib/playback/time";
import {
  captureMediaState,
  isCurrentQualitySwitch,
  preserveInitialMediaState,
  providerQualityOptions,
  restoreMediaState,
  selectManualQualitySource,
  type MediaStateSnapshot,
} from "@/lib/playback/quality";
import styles from "./KairoPlayer.module.css";

export type SourceMode = "auto" | "hls" | "mp4";

export type PlaybackEvent = {
  event:
    "loadedmetadata" | "timeupdate" | "pause" | "seeking" | "seeked" | "ended";
  episode: number;
  sourceUrl: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  seeking: boolean;
};

type Telemetry = {
  provider: string;
  protocol: PlaybackProtocol | "none";
  quality?: number | null;
  readyState: number;
  networkState: number;
  currentTime: number;
  duration: number;
  buffered: string;
  bufferedEnd: number;
  bufferAhead: number;
  manifestLoaded: boolean;
  level: number;
  fragmentLoading: boolean;
  hlsError: string;
  hlsMode: HlsPlaybackMode | "none";
  hlsFatalErrors: number;
  hlsNonFatalErrors: number;
};

export type StallRecord = Pick<
  Telemetry,
  | "currentTime"
  | "readyState"
  | "networkState"
  | "bufferAhead"
  | "protocol"
  | "hlsError"
> & {
  event: "waiting" | "stalled";
  observedAt: string;
};

const emptyTelemetry: Telemetry = {
  provider: "none",
  protocol: "none",
  readyState: 0,
  networkState: 0,
  currentTime: 0,
  duration: 0,
  buffered: "—",
  bufferedEnd: 0,
  bufferAhead: 0,
  manifestLoaded: false,
  level: -1,
  fragmentLoading: false,
  hlsError: "—",
  hlsMode: "none",
  hlsFatalErrors: 0,
  hlsNonFatalErrors: 0,
};

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type PlayerMenu = "settings" | "quality" | "speed" | "subtitles" | null;

type EpisodeNavigation = {
  current: number;
  count?: number;
  loading: boolean;
  hidden?: boolean;
  onChange: (episode: number) => void;
};

type SubtitleOption = {
  id: number;
  label: string;
  language: string;
};

type SeekFeedback = {
  direction: "backward" | "forward";
  nonce: number;
};

type QualitySwitch = {
  snapshot: MediaStateSnapshot;
  targetQuality: number | null;
  recovering: boolean;
};

function chooseSource(
  descriptor: PlaybackDescriptor,
  mode: SourceMode,
): PlaybackSource | undefined {
  if (mode === "mp4")
    return descriptor.sources.find((source) => source.protocol === "mp4");
  return (
    descriptor.sources.find((source) => source.protocol === "hls") ??
    (mode === "auto" ? descriptor.sources[0] : undefined)
  );
}

function mediaSnapshot(
  video: HTMLVideoElement,
  source: PlaybackSource,
  provider: string,
  extra: Partial<Telemetry>,
): Telemetry {
  const ranges = Array.from(
    { length: video.buffered.length },
    (_, index) =>
      `${video.buffered.start(index).toFixed(2)}–${video.buffered.end(index).toFixed(2)}`,
  );
  let bufferAhead = 0;
  let bufferedEnd = 0;
  for (let index = 0; index < video.buffered.length; index += 1) {
    if (
      video.buffered.start(index) <= video.currentTime &&
      video.buffered.end(index) >= video.currentTime
    ) {
      bufferAhead = video.buffered.end(index) - video.currentTime;
      bufferedEnd = video.buffered.end(index);
      break;
    }
  }
  return {
    ...emptyTelemetry,
    ...extra,
    provider,
    protocol: source.protocol,
    quality: source.quality,
    readyState: video.readyState,
    networkState: video.networkState,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : 0,
    buffered: ranges.join(", ") || "—",
    bufferedEnd,
    bufferAhead,
  };
}

export function KairoPlayer({
  descriptor,
  mode = "auto",
  onStall,
  onPlaybackEvent,
  resumePosition,
  autoPlayRequest = 0,
  emptyMessage = "Resolve an episode to begin.",
  showTelemetry = true,
  episodeNavigation,
}: {
  descriptor: PlaybackDescriptor | null;
  mode?: SourceMode;
  onStall?: (stall: StallRecord) => void;
  onPlaybackEvent?: (event: PlaybackEvent) => void;
  resumePosition?: number | null;
  autoPlayRequest?: number;
  emptyMessage?: string;
  showTelemetry?: boolean;
  episodeNavigation?: EpisodeNavigation;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const generationRef = useRef(0);
  const playbackEventRef = useRef(onPlaybackEvent);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const episodeSwitchPendingRef = useRef(false);
  const qualitySwitchRef = useRef<QualitySwitch | null>(null);
  const [telemetry, setTelemetry] = useState(emptyTelemetry);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeMenu, setActiveMenu] = useState<PlayerMenu>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [selectedHeight, setSelectedHeight] = useState<number | null>(null);
  const [manualSelection, setManualSelection] = useState<{
    descriptor: PlaybackDescriptor;
    quality: number;
  } | null>(null);
  const [qualityNotice, setQualityNotice] = useState("");
  const [subtitleOptions, setSubtitleOptions] = useState<SubtitleOption[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [pipSupported, setPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [timelineActive, setTimelineActive] = useState(false);
  const [timelinePreview, setTimelinePreview] = useState<{
    time: number;
    percent: number;
  } | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedback | null>(null);
  const baselineSource = useMemo(
    () => (descriptor ? chooseSource(descriptor, mode) : undefined),
    [descriptor, mode],
  );
  const manualQuality =
    manualSelection?.descriptor === descriptor ? manualSelection.quality : null;
  const providerQualities = useMemo(
    () =>
      descriptor && baselineSource
        ? providerQualityOptions(descriptor.sources, baselineSource.protocol)
        : [],
    [baselineSource, descriptor],
  );
  const manualSource = useMemo(
    () =>
      descriptor && baselineSource && manualQuality
        ? selectManualQualitySource(
            descriptor.sources,
            baselineSource,
            manualQuality,
          )
        : undefined,
    [baselineSource, descriptor, manualQuality],
  );
  const source = manualSource ?? baselineSource;
  const visibleSkipSegment = useMemo(
    () =>
      activeSkipSegment(descriptor?.skipSegments ?? [], telemetry.currentTime),
    [descriptor, telemetry.currentTime],
  );
  const bufferedPercent = telemetry.duration
    ? Math.min(100, (telemetry.bufferedEnd / telemetry.duration) * 100)
    : 0;

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearControlsTimer();
    if (playing && !activeMenu && !timelineActive)
      controlsTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        2800,
      );
  }, [activeMenu, clearControlsTimer, playing, timelineActive]);

  useEffect(() => {
    playbackEventRef.current = onPlaybackEvent;
  }, [onPlaybackEvent]);

  useEffect(() => {
    const video = videoRef.current;
    const generation = ++generationRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const qualitySwitch = qualitySwitchRef.current;
    queueMicrotask(() => {
      if (generationRef.current !== generation) return;
      setHlsLevels([]);
      setSelectedLevel(-1);
      if (!qualitySwitch) {
        setSelectedHeight(null);
        setQualityNotice("");
      }
      setSubtitleOptions([]);
      setSelectedSubtitle(-1);
      setActiveMenu(null);
      if (!qualitySwitch) setPlaying(false);
      setControlsVisible(true);
      setPipSupported(
        document.pictureInPictureEnabled === true &&
          typeof videoRef.current?.requestPictureInPicture === "function",
      );
    });
    if (!video || !source || !descriptor) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
    setError("");
    setTelemetry({
      ...emptyTelemetry,
      provider: descriptor.provider,
      protocol: source.protocol,
      quality: source.quality,
    });
    let disposed = false;
    let qualityRestored = false;
    const hlsState: Partial<Telemetry> = {};
    const refreshNativeSubtitles = () => {
      if (hlsRef.current?.subtitleTracks.length) return;
      setSubtitleOptions(
        Array.from(video.textTracks).map((track, index) => ({
          id: index,
          label: track.label || track.language || `Track ${index + 1}`,
          language: track.language,
        })),
      );
      setSelectedSubtitle(
        Array.from(video.textTracks).findIndex(
          (track) => track.mode === "showing",
        ),
      );
    };
    const refresh = (event?: Event) => {
      if (!disposed && generationRef.current === generation)
        setTelemetry(
          mediaSnapshot(video, source, descriptor.provider, hlsState),
        );
      if (
        event &&
        [
          "loadedmetadata",
          "timeupdate",
          "pause",
          "seeking",
          "seeked",
          "ended",
        ].includes(event.type) &&
        !disposed &&
        generationRef.current === generation
      )
        Object.assign(video.dataset, {
          lastPlaybackEvent: event.type,
          playbackCurrentTime: String(video.currentTime),
          playbackDuration: String(video.duration),
          playbackSeeking: String(video.seeking),
        });
      if (
        event &&
        [
          "loadedmetadata",
          "timeupdate",
          "pause",
          "seeking",
          "seeked",
          "ended",
        ].includes(event.type) &&
        !disposed &&
        generationRef.current === generation
      )
        playbackEventRef.current?.({
          event: event.type as PlaybackEvent["event"],
          episode: descriptor.episode,
          sourceUrl: source.url,
          currentTime: video.currentTime,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          paused: video.paused,
          seeking: video.seeking,
        });
    };
    const restoreQualitySwitch = () => {
      const pending = qualitySwitchRef.current;
      if (
        qualityRestored ||
        !pending ||
        !isCurrentQualitySwitch(pending.targetQuality, manualQuality ?? null) ||
        disposed ||
        generationRef.current !== generation ||
        video.readyState < HTMLMediaElement.HAVE_METADATA
      )
        return;
      qualityRestored = true;
      restoreMediaState(video, pending.snapshot);
      setVolume(pending.snapshot.volume);
      setMuted(pending.snapshot.muted);
      setPlaybackRate(pending.snapshot.playbackRate);
      const continuePlayback = () => {
        if (
          !pending.snapshot.paused &&
          generationRef.current === generation &&
          !disposed
        )
          void video.play().catch(() => undefined);
      };
      if (video.seeking)
        video.addEventListener("seeked", continuePlayback, { once: true });
      else continuePlayback();
      qualitySwitchRef.current = null;
    };
    video.addEventListener("loadedmetadata", restoreQualitySwitch);
    video.addEventListener("durationchange", restoreQualitySwitch);
    const mediaEvents = [
      "loadedmetadata",
      "durationchange",
      "progress",
      "timeupdate",
      "playing",
      "pause",
      "volumechange",
      "seeking",
      "seeked",
      "ended",
      "stalled",
      "waiting",
      "error",
    ];
    mediaEvents.forEach((event) => video.addEventListener(event, refresh));
    video.textTracks.addEventListener("addtrack", refreshNativeSubtitles);
    video.textTracks.addEventListener("removetrack", refreshNativeSubtitles);
    video.textTracks.addEventListener("change", refreshNativeSubtitles);
    const recordStall = (event: Event) => {
      const snapshot = mediaSnapshot(
        video,
        source,
        descriptor.provider,
        hlsState,
      );
      onStall?.({
        currentTime: snapshot.currentTime,
        readyState: snapshot.readyState,
        networkState: snapshot.networkState,
        bufferAhead: snapshot.bufferAhead,
        protocol: snapshot.protocol,
        hlsError: snapshot.hlsError,
        event: event.type === "stalled" ? "stalled" : "waiting",
        observedAt: new Date().toISOString(),
      });
    };
    video.addEventListener("waiting", recordStall);
    video.addEventListener("stalled", recordStall);
    const setup = async () => {
      if (source.protocol === "hls") {
        const nativeHls = Boolean(
          video.canPlayType("application/vnd.apple.mpegurl") ||
          video.canPlayType("application/x-mpegURL"),
        );
        const safari = isSafariBrowser({
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
        });
        if (safari && nativeHls) {
          hlsState.hlsMode = "native";
          video.src = source.url;
          refresh();
          return;
        }
        const { default: Hls } = await import("hls.js");
        if (disposed || generationRef.current !== generation) return;
        const playbackMode = chooseHlsPlaybackMode({
          nativeHls,
          mseHls: Hls.isSupported(),
          safari,
        });
        if (playbackMode === "native") {
          hlsState.hlsMode = "native";
          video.src = source.url;
          refresh();
          return;
        }
        if (playbackMode !== "mse")
          throw new Error("HLS is not supported in this browser");
        hlsState.hlsMode = "mse";
        const hls = new Hls();
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hlsState.manifestLoaded = true;
          setHlsLevels(
            Array.from(
              new Set(
                hls.levels
                  .map((level) => level.height)
                  .filter((height) => height > 0),
              ),
            ).sort((left, right) => right - left),
          );
          refresh();
        });
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
          setSubtitleOptions(
            data.subtitleTracks.map((track, index) => ({
              id: index,
              label: track.name || track.lang || `Track ${index + 1}`,
              language: track.lang || "",
            })),
          );
          setSelectedSubtitle(hls.subtitleTrack);
        });
        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_event, data) => {
          setSelectedSubtitle(data.id);
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          hlsState.level = data.level;
          if (hls.autoLevelEnabled) setSelectedLevel(-1);
          refresh();
        });
        hls.on(Hls.Events.FRAG_LOADING, () => {
          hlsState.fragmentLoading = true;
          refresh();
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          hlsState.fragmentLoading = false;
          refresh();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          hlsState.hlsError = `${data.type}:${data.details}${data.fatal ? ":fatal" : ""}`;
          if (data.fatal)
            hlsState.hlsFatalErrors = (hlsState.hlsFatalErrors ?? 0) + 1;
          else
            hlsState.hlsNonFatalErrors = (hlsState.hlsNonFatalErrors ?? 0) + 1;
          refresh();
          if (data.fatal && manualQuality !== null) {
            qualitySwitchRef.current = {
              snapshot:
                qualitySwitchRef.current?.snapshot ?? captureMediaState(video),
              targetQuality: null,
              recovering: true,
            };
            setQualityNotice("Не удалось переключить качество");
            setSelectedHeight(null);
            setManualSelection(null);
          } else if (data.fatal) setError(`HLS: ${data.details}`);
        });
        hls.loadSource(source.url);
        hls.attachMedia(video);
        refresh();
      } else {
        video.src = source.url;
      }
    };
    setup().catch((reason) => {
      if (!disposed && manualQuality !== null) {
        qualitySwitchRef.current = {
          snapshot: preserveInitialMediaState(
            qualitySwitchRef.current?.snapshot,
            video,
          ),
          targetQuality: null,
          recovering: true,
        };
        setQualityNotice("Не удалось переключить качество");
        setSelectedHeight(null);
        setManualSelection(null);
      } else if (!disposed)
        setError(
          reason instanceof Error ? reason.message : "Playback setup failed",
        );
    });
    return () => {
      disposed = true;
      mediaEvents.forEach((event) => video.removeEventListener(event, refresh));
      video.removeEventListener("waiting", recordStall);
      video.removeEventListener("stalled", recordStall);
      video.textTracks.removeEventListener("addtrack", refreshNativeSubtitles);
      video.textTracks.removeEventListener(
        "removetrack",
        refreshNativeSubtitles,
      );
      video.textTracks.removeEventListener("change", refreshNativeSubtitles);
      video.removeEventListener("loadedmetadata", restoreQualitySwitch);
      video.removeEventListener("durationchange", restoreQualitySwitch);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [descriptor, source, onStall, manualQuality]);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      !source ||
      qualitySwitchRef.current ||
      !resumePosition ||
      resumePosition < 5
    )
      return;
    let applied = false;
    const apply = () => {
      if (
        applied ||
        video.readyState < HTMLMediaElement.HAVE_METADATA ||
        !Number.isFinite(video.duration) ||
        video.duration <= 0 ||
        resumePosition >= video.duration * 0.95
      )
        return;
      video.currentTime = Math.min(
        resumePosition,
        Math.max(0, video.duration - 5),
      );
      video.dataset.resumeApplied = String(video.currentTime);
      applied = true;
    };
    apply();
    video.addEventListener("loadedmetadata", apply);
    video.addEventListener("durationchange", apply);
    return () => {
      video.removeEventListener("loadedmetadata", apply);
      video.removeEventListener("durationchange", apply);
    };
  }, [resumePosition, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || autoPlayRequest <= 0) return;
    const play = () => void video.play().catch(() => undefined);
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();
    else video.addEventListener("canplay", play, { once: true });
    return () => video.removeEventListener("canplay", play);
  }, [autoPlayRequest, source]);

  useEffect(() => {
    if (!playing || activeMenu || timelineActive) {
      clearControlsTimer();
      return;
    }
    controlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      2800,
    );
    return clearControlsTimer;
  }, [activeMenu, clearControlsTimer, playing, timelineActive]);

  useEffect(() => {
    const handleFullscreen = () =>
      setIsFullscreen(
        document.fullscreenElement === videoRef.current?.parentElement,
      );
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => {
    if (!activeMenu) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !settingsRef.current?.contains(event.target)
      )
        setActiveMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMenu(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!episodeNavigation?.loading) episodeSwitchPendingRef.current = false;
  }, [episodeNavigation?.loading]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const entered = () => setIsPip(true);
    const left = () => setIsPip(false);
    video.addEventListener("enterpictureinpicture", entered);
    video.addEventListener("leavepictureinpicture", left);
    return () => {
      video.removeEventListener("enterpictureinpicture", entered);
      video.removeEventListener("leavepictureinpicture", left);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
    setPlaying(!video.paused);
  };

  const toggleFullscreen = async () => {
    const frame = videoRef.current?.parentElement;
    if (!frame) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.requestFullscreen();
  };

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.max(
      0,
      Math.min(duration, video.currentTime + delta),
    );
    setSeekFeedback({
      direction: delta < 0 ? "backward" : "forward",
      nonce: Date.now(),
    });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setSeekFeedback(null), 620);
  }, []);

  const changeVolume = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(1, nextVolume));
    video.volume = next;
    video.muted = false;
    setVolume(next);
    setMuted(false);
  }, []);

  const selectQuality = (height: number | "auto") => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (height === "auto") {
      if (manualQuality !== null && video) {
        qualitySwitchRef.current = {
          snapshot:
            qualitySwitchRef.current?.snapshot ?? captureMediaState(video),
          targetQuality: null,
          recovering: false,
        };
        setManualSelection(null);
      } else if (hls) hls.currentLevel = -1;
      setSelectedLevel(-1);
      setSelectedHeight(null);
      setQualityNotice("");
    } else if (hls && hlsLevels.length > 1) {
      const index = hls.levels.findIndex((level) => level.height === height);
      if (index >= 0) {
        hls.currentLevel = index;
        setSelectedLevel(index);
        setSelectedHeight(height);
      }
    } else if (
      video &&
      descriptor &&
      baselineSource &&
      selectManualQualitySource(descriptor.sources, baselineSource, height)
    ) {
      qualitySwitchRef.current = {
        snapshot: preserveInitialMediaState(
          qualitySwitchRef.current?.snapshot,
          video,
        ),
        targetQuality: height,
        recovering: false,
      };
      setQualityNotice("");
      setSelectedLevel(-1);
      setSelectedHeight(height);
      setManualSelection({ descriptor, quality: height });
    }
    setActiveMenu("settings");
  };

  const selectedQuality = selectedHeight ? `${selectedHeight}p` : "Auto";
  const qualityOptions = Array.from(
    new Set([
      ...hlsLevels,
      ...(providerQualities.length > 1 ? providerQualities : []),
    ]),
  ).sort((left, right) => right - left);

  const selectSubtitle = (id: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current?.subtitleTracks.length) {
      hlsRef.current.subtitleTrack = id;
    } else {
      Array.from(video.textTracks).forEach((track, index) => {
        track.mode = index === id ? "showing" : "disabled";
      });
    }
    setSelectedSubtitle(id);
    setActiveMenu("settings");
  };

  const navigateEpisode = (nextEpisode: number) => {
    if (
      !episodeNavigation ||
      episodeNavigation.loading ||
      episodeSwitchPendingRef.current ||
      nextEpisode < 1 ||
      (episodeNavigation.count && nextEpisode > episodeNavigation.count)
    )
      return;
    episodeSwitchPendingRef.current = true;
    episodeNavigation.onChange(nextEpisode);
  };

  const handlePlayerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(target.tagName) ||
      target.isContentEditable
    ) {
      if (event.key === "Escape") setActiveMenu(null);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      void togglePlayback();
    } else if (event.key.toLowerCase() === "f") void toggleFullscreen();
    else if (event.key.toLowerCase() === "m") {
      video.muted = !video.muted;
      setMuted(video.muted);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(event.key === "ArrowLeft" ? -5 : 5);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      changeVolume(video.volume + (event.key === "ArrowUp" ? 0.05 : -0.05));
    }
  };

  return (
    <section
      className={styles.player}
      data-testid="kairo-player"
      data-hls-mode={telemetry.hlsMode}
      data-hls-fatal-errors={telemetry.hlsFatalErrors}
      data-hls-non-fatal-errors={telemetry.hlsNonFatalErrors}
      data-hls-level-count={hlsLevels.length}
      data-provider-quality-count={providerQualities.length}
      data-selected-quality={manualQuality ?? "auto"}
      data-subtitle-track-count={subtitleOptions.length}
      data-resume-position={resumePosition ?? ""}
    >
      <div
        className={`${styles.videoFrame} ${controlsVisible ? styles.controlsVisible : ""}`}
        data-controls-visible={controlsVisible}
        onPointerMove={revealControls}
        onPointerDown={revealControls}
        onMouseLeave={() => {
          if (playing && !activeMenu) setControlsVisible(false);
        }}
        onKeyDown={handlePlayerKeyDown}
        tabIndex={0}
        aria-label="Видеоплеер Kairo"
      >
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          onClick={revealControls}
          onDoubleClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const position = (event.clientX - bounds.left) / bounds.width;
            if (position < 1 / 3) seekBy(-5);
            else if (position > 2 / 3) seekBy(5);
            else void toggleFullscreen();
          }}
          onPlay={() => {
            setPlaying(true);
            setControlsVisible(true);
          }}
          onPause={() => {
            setPlaying(false);
            setControlsVisible(true);
          }}
          onError={() => setError("Browser media error")}
        />
        {seekFeedback ? (
          <div
            className={`${styles.seekFeedback} ${seekFeedback.direction === "backward" ? styles.seekFeedbackLeft : styles.seekFeedbackRight}`}
            key={seekFeedback.nonce}
            aria-live="polite"
            data-testid="seek-feedback"
          >
            {seekFeedback.direction === "backward" ? (
              <RotateCcw aria-hidden="true" />
            ) : (
              <RotateCw aria-hidden="true" />
            )}
            <span>5 сек</span>
          </div>
        ) : null}
        {episodeNavigation && !episodeNavigation.hidden ? (
          <div
            className={styles.episodeNavigator}
            data-testid="episode-navigator"
            aria-label="Навигация по сериям"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Предыдущая серия"
              disabled={
                episodeNavigation.loading || episodeNavigation.current <= 1
              }
              onClick={() => navigateEpisode(episodeNavigation.current - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span
              key={episodeNavigation.current}
              className={styles.episodeLabel}
            >
              {episodeNavigation.loading ? (
                <LoaderCircle
                  className={styles.episodeSpinner}
                  aria-hidden="true"
                />
              ) : null}
              <span className={styles.episodeDesktopLabel}>
                Серия {episodeNavigation.current}
                {episodeNavigation.count
                  ? ` из ${episodeNavigation.count}`
                  : ""}
              </span>
              <span className={styles.episodeMobileLabel}>
                {episodeNavigation.current}
                {episodeNavigation.count ? ` / ${episodeNavigation.count}` : ""}
              </span>
            </span>
            <button
              type="button"
              aria-label="Следующая серия"
              disabled={
                episodeNavigation.loading ||
                !episodeNavigation.count ||
                episodeNavigation.current >= episodeNavigation.count
              }
              onClick={() => navigateEpisode(episodeNavigation.current + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {source && !playing ? (
          <button
            className={styles.centerPlay}
            type="button"
            aria-label="Воспроизвести"
            onClick={() => void togglePlayback()}
          >
            <Play aria-hidden="true" fill="currentColor" />
          </button>
        ) : null}
        {visibleSkipSegment ? (
          <button
            className={styles.skipButton}
            type="button"
            aria-label={
              visibleSkipSegment.kind === "opening"
                ? "Пропустить опенинг"
                : "Пропустить эндинг"
            }
            data-testid={`skip-${visibleSkipSegment.kind}`}
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              const wasPlaying = !video.paused;
              const skipGeneration = generationRef.current;
              const continuePlayback = () =>
                skipGeneration === generationRef.current
                  ? void video.play().catch(() => undefined)
                  : undefined;
              if (wasPlaying)
                video.addEventListener("seeked", continuePlayback, {
                  once: true,
                });
              video.currentTime = skipTarget(visibleSkipSegment);
              if (wasPlaying && !video.seeking) {
                video.removeEventListener("seeked", continuePlayback);
                continuePlayback();
              }
            }}
          >
            {visibleSkipSegment.kind === "opening"
              ? "Пропустить опенинг"
              : "Пропустить эндинг"}
          </button>
        ) : null}
        {!descriptor ? <p className={styles.overlay}>{emptyMessage}</p> : null}
        {error ? (
          <p className={`${styles.overlay} ${styles.error}`} role="alert">
            {error}
          </p>
        ) : null}
        {qualityNotice ? (
          <p className={styles.qualityNotice} role="status">
            {qualityNotice}
          </p>
        ) : null}
        {source ? (
          <div
            className={styles.controlSurface}
            onPointerEnter={clearControlsTimer}
            onPointerLeave={revealControls}
          >
            <div className={styles.timelineWrap}>
              {timelinePreview ? (
                <output
                  className={styles.timelinePreview}
                  style={{ left: `${timelinePreview.percent}%` }}
                  data-testid="timeline-preview"
                >
                  {formatPlaybackTime(timelinePreview.time)}
                </output>
              ) : null}
              <div
                className={styles.timelineBuffered}
                style={{ width: `${bufferedPercent}%` }}
              />
              <div
                className={styles.timelinePlayed}
                style={{
                  width: `${telemetry.duration ? Math.min(100, (telemetry.currentTime / telemetry.duration) * 100) : 0}%`,
                }}
              />
              <input
                className={styles.timeline}
                aria-label="Позиция воспроизведения"
                type="range"
                min="0"
                max={telemetry.duration || 0}
                step="0.1"
                value={Math.min(telemetry.currentTime, telemetry.duration || 0)}
                disabled={!telemetry.duration}
                onPointerMove={(event) => {
                  if (!telemetry.duration) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const percent = Math.max(
                    0,
                    Math.min(
                      100,
                      ((event.clientX - bounds.left) / bounds.width) * 100,
                    ),
                  );
                  setTimelinePreview({
                    percent,
                    time: (percent / 100) * telemetry.duration,
                  });
                }}
                onPointerLeave={() => setTimelinePreview(null)}
                onPointerDown={() => setTimelineActive(true)}
                onPointerUp={() => setTimelineActive(false)}
                onBlur={() => setTimelineActive(false)}
                onChange={(event) => {
                  if (videoRef.current)
                    videoRef.current.currentTime = Number(event.target.value);
                }}
              />
            </div>
            <div className={styles.controlRow}>
              <div className={styles.controlGroup}>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => seekBy(-5)}
                  aria-label="Назад на 5 секунд"
                  title="Назад на 5 секунд (←)"
                >
                  <RotateCcw aria-hidden="true" />
                  <span className={styles.seekNumber}>5</span>
                </button>
                <button
                  className={`${styles.iconButton} ${styles.playButton}`}
                  type="button"
                  onClick={() => void togglePlayback()}
                  aria-label={playing ? "Пауза" : "Воспроизвести"}
                  title={playing ? "Пауза (K)" : "Воспроизвести (K)"}
                >
                  {playing ? (
                    <Pause aria-hidden="true" fill="currentColor" />
                  ) : (
                    <Play aria-hidden="true" fill="currentColor" />
                  )}
                </button>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => seekBy(5)}
                  aria-label="Вперёд на 5 секунд"
                  title="Вперёд на 5 секунд (→)"
                >
                  <RotateCw aria-hidden="true" />
                  <span className={styles.seekNumber}>5</span>
                </button>
                <output className={styles.timeDisplay} aria-live="off">
                  <span>{formatPlaybackTime(telemetry.currentTime)}</span>
                  <span className={styles.durationTime} aria-hidden="true">
                    {" / "}
                    {formatPlaybackTime(telemetry.duration)}
                  </span>
                </output>
              </div>
              <div className={`${styles.controlGroup} ${styles.rightControls}`}>
                <div className={styles.menuAnchor} ref={settingsRef}>
                  <button
                    className={`${styles.iconButton} ${activeMenu ? styles.settingsOpen : ""}`}
                    type="button"
                    aria-label="Настройки"
                    aria-haspopup="menu"
                    aria-expanded={activeMenu !== null}
                    title="Настройки"
                    onClick={() =>
                      setActiveMenu((current) => (current ? null : "settings"))
                    }
                  >
                    <Settings2 aria-hidden="true" />
                  </button>
                  {activeMenu ? (
                    <div
                      className={`${styles.menu} ${styles.settingsMenu} ${activeMenu !== "settings" ? styles.settingsSubmenu : ""}`}
                      role="menu"
                      aria-label={
                        activeMenu === "settings"
                          ? "Настройки"
                          : activeMenu === "quality"
                            ? "Качество видео"
                            : activeMenu === "speed"
                              ? "Скорость воспроизведения"
                              : "Субтитры"
                      }
                    >
                      {activeMenu === "settings" ? (
                        <>
                          <strong className={styles.menuTitle}>
                            Настройки
                          </strong>
                          <button
                            type="button"
                            onClick={() => setActiveMenu("quality")}
                          >
                            <span>Качество</span>
                            <span className={styles.menuValue}>
                              {selectedQuality}
                              <ChevronRight aria-hidden="true" />
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMenu("speed")}
                          >
                            <span>Скорость</span>
                            <span className={styles.menuValue}>
                              {playbackRate}x<ChevronRight aria-hidden="true" />
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!subtitleOptions.length}
                            onClick={() => setActiveMenu("subtitles")}
                          >
                            <span>Субтитры</span>
                            <span className={styles.menuValue}>
                              {subtitleOptions.length
                                ? selectedSubtitle < 0
                                  ? "Выкл."
                                  : subtitleOptions.find(
                                      (track) => track.id === selectedSubtitle,
                                    )?.label
                                : "Недоступны"}
                              {subtitleOptions.length ? (
                                <ChevronRight aria-hidden="true" />
                              ) : null}
                            </span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={styles.menuBack}
                            type="button"
                            onClick={() => setActiveMenu("settings")}
                          >
                            <ArrowLeft aria-hidden="true" />
                            <strong>
                              {activeMenu === "quality"
                                ? "Качество"
                                : activeMenu === "speed"
                                  ? "Скорость"
                                  : "Субтитры"}
                            </strong>
                          </button>
                          {activeMenu === "quality" ? (
                            <>
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={selectedLevel < 0}
                                onClick={() => selectQuality("auto")}
                              >
                                <span>Авто</span>
                                {selectedLevel < 0 ? (
                                  <Check aria-hidden="true" />
                                ) : null}
                              </button>
                              {qualityOptions.map((height) => {
                                const active = selectedHeight === height;
                                return (
                                  <button
                                    key={height}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    onClick={() => selectQuality(height)}
                                  >
                                    <span>{height}p</span>
                                    {active ? (
                                      <Check aria-hidden="true" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </>
                          ) : activeMenu === "speed" ? (
                            playbackRates.map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                role="menuitemradio"
                                aria-checked={playbackRate === rate}
                                onClick={() => {
                                  setPlaybackRate(rate);
                                  if (videoRef.current)
                                    videoRef.current.playbackRate = rate;
                                  setActiveMenu("settings");
                                }}
                              >
                                <span>{rate}x</span>
                                {playbackRate === rate ? (
                                  <Check aria-hidden="true" />
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <>
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={selectedSubtitle < 0}
                                onClick={() => selectSubtitle(-1)}
                              >
                                <span>Выкл.</span>
                                {selectedSubtitle < 0 ? (
                                  <Check aria-hidden="true" />
                                ) : null}
                              </button>
                              {subtitleOptions.map((track) => (
                                <button
                                  key={`${track.id}-${track.language}`}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={selectedSubtitle === track.id}
                                  onClick={() => selectSubtitle(track.id)}
                                >
                                  <span>{track.label}</span>
                                  {selectedSubtitle === track.id ? (
                                    <Check aria-hidden="true" />
                                  ) : null}
                                </button>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className={styles.volumeControl}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={
                      muted || volume === 0 ? "Включить звук" : "Выключить звук"
                    }
                    title="Звук (M)"
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      video.muted = !video.muted;
                      setMuted(video.muted);
                    }}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX aria-hidden="true" />
                    ) : volume < 0.5 ? (
                      <Volume1 aria-hidden="true" />
                    ) : (
                      <Volume2 aria-hidden="true" />
                    )}
                  </button>
                  <input
                    aria-label="Громкость"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setVolume(next);
                      setMuted(false);
                      if (videoRef.current) {
                        videoRef.current.volume = next;
                        videoRef.current.muted = false;
                      }
                    }}
                  />
                </div>
                {pipSupported ? (
                  <button
                    className={`${styles.iconButton} ${styles.pipButton}`}
                    type="button"
                    aria-label={
                      isPip
                        ? "Закрыть картинку в картинке"
                        : "Картинка в картинке"
                    }
                    title="Картинка в картинке"
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      if (document.pictureInPictureElement)
                        void document.exitPictureInPicture();
                      else void video.requestPictureInPicture();
                    }}
                  >
                    <PictureInPicture2 aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={
                    isFullscreen
                      ? "Выйти из полноэкранного режима"
                      : "Полноэкранный режим"
                  }
                  title="Полноэкранный режим (F)"
                >
                  {isFullscreen ? (
                    <Minimize aria-hidden="true" />
                  ) : (
                    <Expand aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {showTelemetry ? (
        <dl className={styles.telemetry} data-testid="telemetry">
          {Object.entries(telemetry).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>
                {typeof value === "number" ? value.toFixed(2) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
