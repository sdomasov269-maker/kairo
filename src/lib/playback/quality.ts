import type { PlaybackSource } from "./descriptor";

export type MediaStateSnapshot = {
  currentTime: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
};

export function providerQualityOptions(
  sources: PlaybackSource[],
  protocol: PlaybackSource["protocol"],
) {
  return Array.from(
    new Set(
      sources
        .filter((source) => source.protocol === protocol)
        .map((source) => source.quality)
        .filter((quality): quality is number => Boolean(quality)),
    ),
  ).sort((left, right) => right - left);
}

export function selectManualQualitySource(
  sources: PlaybackSource[],
  baseline: PlaybackSource,
  quality: number,
) {
  return sources.find(
    (source) =>
      source.protocol === baseline.protocol && source.quality === quality,
  );
}

export function captureMediaState(video: HTMLVideoElement): MediaStateSnapshot {
  return {
    currentTime: video.currentTime,
    paused: video.paused,
    volume: video.volume,
    muted: video.muted,
    playbackRate: video.playbackRate,
  };
}

export function preserveInitialMediaState(
  current: MediaStateSnapshot | null | undefined,
  video: HTMLVideoElement,
) {
  return current ?? captureMediaState(video);
}

export function isCurrentQualitySwitch(
  pendingQuality: number | null,
  activeQuality: number | null,
) {
  return pendingQuality === activeQuality;
}

export function restoreMediaState(
  video: HTMLVideoElement,
  snapshot: MediaStateSnapshot,
) {
  video.volume = snapshot.volume;
  video.muted = snapshot.muted;
  video.playbackRate = snapshot.playbackRate;
  if (Number.isFinite(snapshot.currentTime) && snapshot.currentTime > 0)
    video.currentTime = Math.min(
      snapshot.currentTime,
      Number.isFinite(video.duration)
        ? Math.max(0, video.duration - 0.25)
        : snapshot.currentTime,
    );
}
