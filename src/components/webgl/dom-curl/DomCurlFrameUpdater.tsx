"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { getGlobalCurlStrength } from "../curl/CurlState";
import {
  calculateDomCurlTransform,
  getDomCurlTargets,
  refreshDomCurlRects,
} from "./DomCurlRegistry";
import { getScrollSnapshot } from "../scroll/scrollBus";

export function DomCurlFrameUpdater() {
  useEffect(() => {
    window.addEventListener("resize", refreshDomCurlRects, { passive: true });
    return () => window.removeEventListener("resize", refreshDomCurlRects);
  }, []);

  useFrame(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const strength = reduced ? 0 : getGlobalCurlStrength();
    const { scrollTop, viewportHeight } = getScrollSnapshot();
    for (const target of getDomCurlTargets()) {
      const top = target.rect.top - (scrollTop - target.scrollTop);
      const centerY = top + target.rect.height * 0.5;
      const screenY = centerY / Math.max(viewportHeight, 1);
      if (screenY < -0.5 || screenY > 1.5) continue;
      const transform = calculateDomCurlTransform({
        centerY,
        viewportHeight,
        strength,
        multiplier: target.multiplier,
      });
      target.element.style.setProperty(
        "--kairo-curl-x",
        `${transform.x.toFixed(3)}px`,
      );
      target.element.style.setProperty(
        "--kairo-curl-y",
        `${transform.y.toFixed(3)}px`,
      );
      target.element.style.setProperty(
        "--kairo-curl-scale-x",
        transform.scaleX.toFixed(5),
      );
    }
  }, -1.5);

  return null;
}
