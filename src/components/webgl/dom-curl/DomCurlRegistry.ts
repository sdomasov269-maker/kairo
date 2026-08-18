export type CurlTargetKind = "image" | "surface" | "text";

export const CURL_TARGET_MULTIPLIERS: Record<CurlTargetKind, number> = {
  image: 1,
  surface: 0.55,
  text: 0.25,
};

type DomCurlTarget = {
  element: HTMLElement;
  key: string;
  kind: Exclude<CurlTargetKind, "image">;
  multiplier: number;
  rect: DOMRect;
  scrollTop: number;
};

const targets = new Map<string, DomCurlTarget>();

export function registerDomCurlTarget(input: {
  element: HTMLElement;
  key: string;
  kind: Exclude<CurlTargetKind, "image">;
  multiplier?: number;
}) {
  const target: DomCurlTarget = {
    ...input,
    multiplier: input.multiplier ?? CURL_TARGET_MULTIPLIERS[input.kind],
    rect: input.element.getBoundingClientRect(),
    scrollTop: window.scrollY,
  };
  targets.set(input.key, target);
  return () => {
    input.element.style.removeProperty("--kairo-curl-x");
    input.element.style.removeProperty("--kairo-curl-y");
    input.element.style.removeProperty("--kairo-curl-scale-x");
    targets.delete(input.key);
  };
}

export function getDomCurlTargets() {
  return targets.values();
}

export function refreshDomCurlRects() {
  for (const target of targets.values()) {
    target.rect = target.element.getBoundingClientRect();
    target.scrollTop = window.scrollY;
  }
}

export function calculateDomCurlTransform({
  centerY,
  viewportHeight,
  strength,
  multiplier,
}: {
  centerY: number;
  viewportHeight: number;
  strength: number;
  multiplier: number;
}) {
  const screenY = centerY / Math.max(viewportHeight, 1);
  const centered = Math.max(-1, Math.min(1, 2 * screenY - 1));
  const profile = 1 - Math.sqrt(Math.max(0, 1 - centered * centered));
  const amount = strength * multiplier;
  return {
    x: (centered < 0 ? -1 : 1) * profile * amount * 18,
    y: profile * amount * 5,
    scaleX: 1 - profile * amount * 0.35,
  };
}
