import { classifyFrameGap, isFrameGap, median, percentile } from "./frame-pacing.ts";
import { measureBufferedRanges } from "./buffer-telemetry.ts";
import type { KairoPlaybackSnapshot } from "../engine/types.ts";
import type { ShakaTrackLike } from "../engine/types.ts";

type FrameMetadata = { mediaTime: number; expectedDisplayTime: number; presentedFrames: number; processingDuration?: number };
type DiagnosticVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: FrameMetadata) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const MEDIA_EVENTS = ["waiting", "stalled", "playing", "canplay", "canplaythrough", "seeking", "seeked", "loadedmetadata", "loadeddata", "progress", "timeupdate", "ratechange", "error"] as const;

export function diagnosticsEnabled(location: Pick<Location, "search"> | undefined) {
  return process.env.NODE_ENV === "development"
    && Boolean(location && new URLSearchParams(location.search).get("kairoPlaybackDiagnostics") === "1");
}

export class PlaybackDiagnostics {
  private readonly video: DiagnosticVideo;
  private readonly snapshot: () => KairoPlaybackSnapshot;
  private readonly track: () => ShakaTrackLike | undefined;
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameHandle: number | null = null;
  private observer: PerformanceObserver | null = null;
  private lastFrame: { now: number; mediaTime: number; expectedDisplayTime: number } | null = null;
  private readonly frameIntervals: number[] = [];
  private readonly bufferAheadValues: number[] = [];
  private lastPublishedAt = Number.NEGATIVE_INFINITY;
  private capabilitiesRequested = false;
  private lastSeekingAt = Number.NEGATIVE_INFINITY;
  private readonly onMediaEvent = (event: Event) => this.recordMediaEvent(event.type);
  readonly report = {
    startedAt: performance.now(), samples: [] as unknown[],
    mediaEvents: Object.fromEntries(MEDIA_EVENTS.map((event) => [event, 0])) as Record<string, number>,
    eventLog: [] as unknown[], frameCallbacks: 0, frameGaps: [] as unknown[],
    frameIntervalMedian: 0, frameIntervalP95: 0, maxFrameInterval: 0, processingDurationMax: 0,
    longTasks: [] as unknown[], resources: [] as unknown[],
    playbackQualityStart: null as { totalVideoFrames: number; droppedVideoFrames: number; corruptedVideoFrames: number } | null,
    playbackQualityLatest: null as { totalVideoFrames: number; droppedVideoFrames: number; corruptedVideoFrames: number } | null,
    track: null as ShakaTrackLike | null,
    mediaCapabilities: null as { supported: boolean; smooth: boolean; powerEfficient: boolean } | null,
  };

  constructor(video: HTMLVideoElement, snapshot: () => KairoPlaybackSnapshot, track: () => ShakaTrackLike | undefined) {
    this.video = video; this.snapshot = snapshot; this.track = track;
  }

  start() {
    this.report.playbackQualityStart = this.readQuality();
    for (const event of MEDIA_EVENTS) this.video.addEventListener(event, this.onMediaEvent);
    this.timer = setInterval(() => this.sample(), 750);
    this.sample(); this.startFrames(); this.startPerformanceObserver();
    Object.assign(window, { __kairoPlaybackDiagnostics: this.report });
    this.video.dataset.kairoPlaybackDiagnostics = "enabled";
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.frameHandle !== null) this.video.cancelVideoFrameCallback?.(this.frameHandle);
    this.frameHandle = null; this.observer?.disconnect(); this.observer = null;
    for (const event of MEDIA_EVENTS) this.video.removeEventListener(event, this.onMediaEvent);
    delete this.video.dataset.kairoPlaybackDiagnostics;
  }

  private readBuffer() { return measureBufferedRanges(this.video.buffered, this.video.currentTime); }
  private sample() {
    const buffer = this.readBuffer(); const engine = this.snapshot().state;
    this.report.playbackQualityLatest = this.readQuality();
    this.report.track = this.track() ?? null;
    this.checkMediaCapabilities();
    this.pushBounded(this.report.samples, { now: performance.now(), currentTime: this.video.currentTime,
      readyState: this.video.readyState, networkState: this.video.networkState, paused: this.video.paused,
      seeking: this.video.seeking, ranges: buffer.ranges, activeIndex: buffer.activeIndex,
      bufferedEnd: buffer.bufferedEnd, bufferAhead: buffer.bufferedAhead, nextBufferedGap: buffer.nextBufferedGap,
      status: engine.status, shakaBuffering: engine.buffering }, 1600);
    this.bufferAheadValues.push(buffer.bufferedAhead);
    if (this.bufferAheadValues.length > 1600) this.bufferAheadValues.shift();
    if (performance.now() - this.lastPublishedAt >= 5000) this.publish();
  }

  private recordMediaEvent(type: string) {
    this.report.mediaEvents[type] = (this.report.mediaEvents[type] ?? 0) + 1;
    if (type === "seeking" || type === "seeked") this.lastSeekingAt = performance.now();
    const buffer = this.readBuffer();
    this.pushBounded(this.report.eventLog, { type, now: performance.now(), currentTime: this.video.currentTime,
      bufferAhead: buffer.bufferedAhead, readyState: this.video.readyState, networkState: this.video.networkState }, 500);
  }

  private startFrames() {
    if (!this.video.requestVideoFrameCallback) return;
    const callback = (now: number, metadata: FrameMetadata) => {
      this.report.frameCallbacks += 1;
      if (this.lastFrame) {
        const wallClockDelta = now - this.lastFrame.now;
        this.frameIntervals.push(wallClockDelta);
        if (this.frameIntervals.length > 20000) this.frameIntervals.shift();
        const cadence = median(this.frameIntervals.slice(-240));
        this.report.frameIntervalMedian = median(this.frameIntervals);
        this.report.frameIntervalP95 = percentile(this.frameIntervals, 0.95);
        this.report.maxFrameInterval = Math.max(this.report.maxFrameInterval, wallClockDelta);
        if (this.frameIntervals.length >= 30 && isFrameGap(wallClockDelta, cadence)) {
          const buffer = this.readBuffer(); const seeking = this.video.seeking || now - this.lastSeekingAt < 1000;
          this.pushBounded(this.report.frameGaps, { now, mediaTime: metadata.mediaTime, gapMs: wallClockDelta,
            mediaTimeDelta: metadata.mediaTime - this.lastFrame.mediaTime,
            expectedDisplayDelta: metadata.expectedDisplayTime - this.lastFrame.expectedDisplayTime,
            bufferAhead: buffer.bufferedAhead, readyState: this.video.readyState,
            shakaBuffering: this.snapshot().state.buffering, waitingNearby: this.hasRecentEvent("waiting", now, 500),
            classification: classifyFrameGap(buffer.bufferedAhead, seeking) }, 300);
        }
      }
      this.report.processingDurationMax = Math.max(this.report.processingDurationMax, metadata.processingDuration ?? 0);
      this.lastFrame = { now, mediaTime: metadata.mediaTime, expectedDisplayTime: metadata.expectedDisplayTime };
      this.frameHandle = this.video.requestVideoFrameCallback?.(callback) ?? null;
    };
    this.frameHandle = this.video.requestVideoFrameCallback(callback);
  }

  private startPerformanceObserver() {
    if (!("PerformanceObserver" in window)) return;
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") this.pushBounded(this.report.longTasks, { startTime: entry.startTime, duration: entry.duration }, 500);
        if (entry.entryType === "resource" && entry.name.includes("/api/stream/") && entry.name.includes("/resource/")) {
          const token = new URL(entry.name).pathname.split("/").at(-1)?.slice(0, 8) ?? "unknown";
          const timing = entry as PerformanceResourceTiming; const buffer = this.readBuffer();
          this.pushBounded(this.report.resources, { token, startTime: entry.startTime, duration: entry.duration,
            responseStart: timing.responseStart, transferSize: timing.transferSize,
            currentTime: this.video.currentTime, bufferAhead: buffer.bufferedAhead }, 1000);
        }
      }
    });
    try { this.observer.observe({ entryTypes: ["longtask", "resource"] }); } catch { this.observer = null; }
  }

  private hasRecentEvent(type: string, now: number, windowMs: number) {
    return this.report.eventLog.some((value) => { const event = value as { type: string; now: number };
      return event.type === type && Math.abs(now - event.now) <= windowMs; });
  }
  private readQuality() {
    const quality = this.video.getVideoPlaybackQuality?.();
    return quality ? {
      totalVideoFrames: quality.totalVideoFrames,
      droppedVideoFrames: quality.droppedVideoFrames,
      corruptedVideoFrames: quality.corruptedVideoFrames,
    } : null;
  }
  private pushBounded(target: unknown[], value: unknown, limit: number) { target.push(value); if (target.length > limit) target.splice(0, target.length - limit); }
  private publish() {
    this.lastPublishedAt = performance.now();
    const values = this.bufferAheadValues;
    const gaps = this.report.frameGaps as Array<{ gapMs: number }>;
    const rangeGaps = (this.report.samples as Array<{ nextBufferedGap: number | null }>)
      .map((sample) => sample.nextBufferedGap).filter((gap): gap is number => gap !== null && gap > 0);
    this.video.dataset.kairoPlaybackReport = JSON.stringify({
      startedAt: this.report.startedAt, sampleCount: values.length,
      buffer: { min: values.length ? Math.min(...values) : 0, p50: percentile(values, 0.5),
        p95: percentile(values, 0.95), max: values.length ? Math.max(...values) : 0,
        timeRangeGapCount: rangeGaps.length, largestTimeRangeGap: rangeGaps.length ? Math.max(...rangeGaps) : 0 },
      mediaEvents: this.report.mediaEvents, frameCallbacks: this.report.frameCallbacks,
      frameIntervalMedian: this.report.frameIntervalMedian, frameIntervalP95: this.report.frameIntervalP95,
      maxFrameInterval: this.report.maxFrameInterval, frameGapCount: gaps.length,
      frameGaps: [...gaps].sort((left, right) => right.gapMs - left.gapMs).slice(0, 20),
      processingDurationMax: this.report.processingDurationMax,
      longTaskCount: this.report.longTasks.length, longTasks: this.report.longTasks.slice(-50),
      resourceCount: this.report.resources.length, resources: this.report.resources.slice(-100),
      playbackQualityStart: this.report.playbackQualityStart,
      playbackQualityLatest: this.report.playbackQualityLatest,
      track: this.report.track ? {
        width: this.report.track.width, height: this.report.track.height,
        frameRate: this.report.track.frameRate, videoCodec: this.report.track.videoCodec,
        audioCodec: this.report.track.audioCodec, bandwidth: this.report.track.bandwidth,
      } : null,
      mediaCapabilities: this.report.mediaCapabilities,
    });
  }

  private checkMediaCapabilities() {
    const track = this.report.track;
    if (this.capabilitiesRequested || !track?.videoCodec || !navigator.mediaCapabilities?.decodingInfo) return;
    this.capabilitiesRequested = true;
    void navigator.mediaCapabilities.decodingInfo({
      type: "file",
      video: {
        contentType: `video/mp4; codecs="${track.videoCodec}"`,
        width: track.width ?? (this.video.videoWidth || 1280),
        height: track.height ?? (this.video.videoHeight || 720),
        bitrate: track.bandwidth && track.bandwidth > 0 ? track.bandwidth : 2_000_000,
        framerate: track.frameRate && track.frameRate >= 10 ? track.frameRate : 24,
      },
    }).then((result) => {
      this.report.mediaCapabilities = {
        supported: result.supported, smooth: result.smooth, powerEfficient: result.powerEfficient,
      };
    }).catch(() => undefined);
  }
}
