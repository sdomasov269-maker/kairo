export function classifyTimestampDelta(delta: number | null, toleranceSeconds = 0.002) {
  if (delta === null || !Number.isFinite(delta)) return "UNKNOWN" as const;
  if (Math.abs(delta) <= toleranceSeconds) return "CONTINUOUS" as const;
  return delta > 0 ? "GAP" as const : "OVERLAP" as const;
}

export function avSkew(videoTimestamp: number | null, audioTimestamp: number | null) {
  return videoTimestamp === null || audioTimestamp === null ? null : videoTimestamp - audioTimestamp;
}

export function durationError(declaredDuration: number, actualDuration: number | null) {
  return actualDuration === null ? null : actualDuration - declaredDuration;
}
