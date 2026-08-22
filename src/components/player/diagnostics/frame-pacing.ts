export function percentile(values: readonly number[], quantile: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * quantile)))]!;
}

export function median(values: readonly number[]) { return percentile(values, 0.5); }

export function isFrameGap(intervalMs: number, medianIntervalMs: number) {
  return medianIntervalMs > 0 && intervalMs > Math.max(80, medianIntervalMs * 3);
}

export function classifyFrameGap(bufferAhead: number, seeking: boolean) {
  if (seeking) return "SEEK_INDUCED" as const;
  if (bufferAhead <= 1) return "BUFFER_STARVATION" as const;
  if (bufferAhead > 5) return "BUFFERED_FRAME_STALL" as const;
  return "LOW_BUFFER_UNCERTAIN" as const;
}
