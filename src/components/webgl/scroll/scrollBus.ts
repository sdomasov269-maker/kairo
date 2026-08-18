import type Lenis from "lenis";

export type ScrollSnapshot = {
  scrollTop: number;
  velocity: number;
  direction: number;
  progress: number;
  limit: number;
  viewportHeight: number;
};

export const SERVER_SCROLL_SNAPSHOT: ScrollSnapshot = Object.freeze({
  scrollTop: 0,
  velocity: 0,
  direction: 0,
  progress: 0,
  limit: 0,
  viewportHeight: 0,
});

let snapshot: ScrollSnapshot = SERVER_SCROLL_SNAPSHOT;
const listeners = new Set<() => void>();
let unbind: (() => void) | null = null;

export function bindLenisScrollBus(lenis: Lenis | null) {
  unbind?.();
  unbind = null;
  if (!lenis) return;

  const update = (instance: Lenis) => {
    snapshot = {
      scrollTop: instance.scroll,
      velocity: instance.velocity,
      direction: instance.direction,
      progress: instance.progress,
      limit: instance.limit,
      viewportHeight: window.innerHeight,
    };
    for (const listener of listeners) listener();
  };

  update(lenis);
  unbind = lenis.on("scroll", update);
}

export function getScrollSnapshot() {
  return snapshot;
}

export function subscribeScroll(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
