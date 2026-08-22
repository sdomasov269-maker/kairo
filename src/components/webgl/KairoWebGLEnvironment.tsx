"use client";

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { KairoWebGLCanvas } from "./KairoWebGLCanvas";
import { LenisFrameBridge } from "./scroll/LenisFrameBridge";

let webglSupported = false;
let webglChecked = false;
const webglListeners = new Set<() => void>();

function subscribeWebGLSupport(listener: () => void) {
  webglListeners.add(listener);
  if (!webglChecked) {
    webglChecked = true;
    queueMicrotask(() => {
      const canvas = document.createElement("canvas");
      webglSupported = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
      for (const notify of webglListeners) notify();
    });
  }
  return () => webglListeners.delete(listener);
}

export function KairoWebGLEnvironment({ children }: { children: ReactNode }) {
  const supported = useSyncExternalStore(subscribeWebGLSupport, () => webglSupported, () => false);
  if (!supported) return children;
  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false, respectReducedMotion: true }}>
      <LenisFrameBridge />
      <KairoWebGLCanvas />
      {children}
    </ReactLenis>
  );
}
