export type BufferedRange = { start: number; end: number };

export function measureBufferedRanges(ranges: TimeRanges, currentTime: number) {
  const all: BufferedRange[] = [];
  let activeIndex = -1;
  let nextIndex = -1;
  for (let index = 0; index < ranges.length; index += 1) {
    const range = { start: ranges.start(index), end: ranges.end(index) };
    all.push(range);
    if (range.start <= currentTime && range.end >= currentTime) activeIndex = index;
    else if (nextIndex === -1 && range.start > currentTime) nextIndex = index;
  }
  const selectedIndex = activeIndex >= 0 ? activeIndex : nextIndex;
  const selected = selectedIndex >= 0 ? all[selectedIndex] : undefined;
  const next = activeIndex >= 0 ? all[activeIndex + 1] : undefined;
  return {
    ranges: all,
    activeIndex,
    bufferedEnd: selected?.end ?? 0,
    bufferedAhead: selected
      ? activeIndex >= 0 ? Math.max(0, selected.end - currentTime) : Math.max(0, selected.end - selected.start)
      : 0,
    nextBufferedGap: activeIndex >= 0 && next ? Math.max(0, next.start - all[activeIndex]!.end) : null,
  };
}

export function isNearSegmentBoundary(mediaTime: number, boundaries: readonly number[], tolerance = 0.5) {
  return boundaries.some((boundary) => Math.abs(boundary - mediaTime) <= tolerance);
}
