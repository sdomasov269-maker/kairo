export type CachedRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  radius: number;
};

export type DomImageTarget = {
  key: string;
  src: string;
  element: HTMLElement;
  rect: CachedRect | null;
};

const targets = new Map<string, DomImageTarget>();
const listeners = new Set<() => void>();
let targetSnapshot: DomImageTarget[] = [];

function publish() {
  targetSnapshot = Array.from(targets.values());
  for (const listener of listeners) listener();
}

export function registerDomImageTarget(target: Omit<DomImageTarget, "rect">) {
  targets.set(target.key, { ...target, rect: null });
  publish();
  return () => {
    const current = targets.get(target.key);
    if (current?.element === target.element) {
      delete current.element.dataset.webglReady;
      targets.delete(target.key);
      publish();
    }
  };
}

export function getDomImageTargets() {
  return targetSnapshot;
}

export function subscribeDomImageTargets(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDomTargetReady(target: DomImageTarget, ready: boolean) {
  const debugDomOnly =
    process.env.NODE_ENV === "development" &&
    document.documentElement.dataset.kairoWebglDebug === "dom";
  ready = ready && !debugDomOnly;
  if (ready) {
    if (target.element.dataset.webglReady !== "true")
      target.element.dataset.webglReady = "true";
  } else if (target.element.dataset.webglReady) {
    delete target.element.dataset.webglReady;
  }
}

export function resetDomTargetReadiness() {
  for (const target of targets.values()) setDomTargetReady(target, false);
}

export function invalidateDomTargetRects() {
  for (const target of targets.values()) target.rect = null;
}
