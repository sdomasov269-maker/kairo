export type TimestampClassification = "CONTINUOUS" | "GAP" | "OVERLAP" | "UNKNOWN";

export function timestampDelta(previousTimestamp: number | null, previousDuration: number | null, nextTimestamp: number | null) {
  if (previousTimestamp === null || previousDuration === null || nextTimestamp === null) return null;
  return nextTimestamp - (previousTimestamp + previousDuration);
}

export function classifyTimestampDelta(delta: number | null, toleranceSeconds = 0.002): TimestampClassification {
  if (delta === null || !Number.isFinite(delta)) return "UNKNOWN";
  if (Math.abs(delta) <= toleranceSeconds) return "CONTINUOUS";
  return delta > 0 ? "GAP" : "OVERLAP";
}

export function avSkew(videoTimestamp: number | null, audioTimestamp: number | null) {
  return videoTimestamp === null || audioTimestamp === null ? null : videoTimestamp - audioTimestamp;
}

export function durationError(declaredDuration: number, actualDuration: number | null) {
  return actualDuration === null ? null : actualDuration - declaredDuration;
}

export function ticksToSeconds(timestamp: number | null, timeBase: { numerator: number; denominator: number }) {
  if (timestamp === null || timeBase.denominator === 0) return null;
  return timestamp * timeBase.numerator / timeBase.denominator;
}

export function boundaryCorrelates(timestampDeltaSeconds: number | null, observedGapSeconds: number | null, toleranceSeconds = 0.005) {
  if (timestampDeltaSeconds === null || observedGapSeconds === null) return false;
  return Math.abs(Math.abs(timestampDeltaSeconds) - observedGapSeconds) <= toleranceSeconds;
}
