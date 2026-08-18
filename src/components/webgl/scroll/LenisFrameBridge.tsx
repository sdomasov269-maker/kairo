"use client";

import { useLenis } from "lenis/react";
import { useEffect } from "react";
import { bindLenisScrollBus } from "./scrollBus";

export function LenisFrameBridge() {
  const lenis = useLenis();

  useEffect(() => {
    bindLenisScrollBus(lenis ?? null);
    return () => bindLenisScrollBus(null);
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    let frame = 0;
    const update = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [lenis]);

  return null;
}
