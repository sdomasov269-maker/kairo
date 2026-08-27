import type { PlaybackSkipSegment } from "./descriptor";

export function activeSkipSegment(
  segments: PlaybackSkipSegment[],
  currentTime: number,
) {
  if (!Number.isFinite(currentTime)) return null;
  return (
    segments.find(
      (segment) =>
        segment.kind !== "unknown" &&
        currentTime >= segment.start &&
        currentTime < segment.end,
    ) ?? null
  );
}

export function skipTarget(segment: PlaybackSkipSegment) {
  return segment.end;
}
