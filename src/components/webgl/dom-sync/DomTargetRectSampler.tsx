"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getScrollSnapshot } from "../scroll/scrollBus";
import {
  getDomImageTargets,
  invalidateDomTargetRects,
  type CachedRect,
} from "./DomTargetRegistry";

function measure(element: HTMLElement): CachedRect {
  const rect = element.getBoundingClientRect();
  const radius = Number.parseFloat(getComputedStyle(element).borderRadius) || 0;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    radius,
  };
}

export function DomTargetRectSampler() {
  const frame = useRef(0);
  const lastScrollTop = useRef(getScrollSnapshot().scrollTop);

  useEffect(() => {
    window.addEventListener("resize", invalidateDomTargetRects, {
      passive: true,
    });
    return () => window.removeEventListener("resize", invalidateDomTargetRects);
  }, []);

  useFrame(() => {
    const targets = getDomImageTargets();
    const scroll = getScrollSnapshot();
    const deltaY = scroll.scrollTop - lastScrollTop.current;
    lastScrollTop.current = scroll.scrollTop;

    for (const target of targets) {
      if (!target.rect) continue;
      target.rect.top -= deltaY;
      target.rect.bottom -= deltaY;
    }

    const viewportHeight = Math.max(
      1,
      scroll.viewportHeight || window.innerHeight,
    );
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const previous = target.rect;
      const nearViewport =
        !previous ||
        (previous.bottom >= -viewportHeight &&
          previous.top <= viewportHeight * 2);
      const staggeredRefresh = frame.current % 12 === index % 12;
      if (!nearViewport && !staggeredRefresh) continue;
      if (!target.element.isConnected) continue;
      target.rect = measure(target.element);
    }
    frame.current += 1;
  }, -3);

  return null;
}
