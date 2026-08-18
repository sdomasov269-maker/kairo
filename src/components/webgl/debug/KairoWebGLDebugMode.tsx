"use client";

import { useEffect } from "react";

const DEBUG_MODES = new Set(["dom", "webgl", "overlay"]);
const TILE_LAYER_MODES = new Set(["before", "after", "surface", "neutral"]);

export function KairoWebGLDebugMode() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const root = document.documentElement;
    const queryMode = new URLSearchParams(window.location.search).get(
      "kairoWebglDebug",
    );
    const storedMode = window.localStorage.getItem("kairoWebglDebug");
    const mode = queryMode ?? storedMode;
    const tileLayer = new URLSearchParams(window.location.search).get(
      "kairoTileDebug",
    );
    if (queryMode && DEBUG_MODES.has(queryMode)) {
      window.localStorage.setItem("kairoWebglDebug", queryMode);
    }
    if (mode && DEBUG_MODES.has(mode)) root.dataset.kairoWebglDebug = mode;
    if (tileLayer && TILE_LAYER_MODES.has(tileLayer))
      root.dataset.kairoTileDebug = tileLayer;
    return () => {
      delete root.dataset.kairoWebglDebug;
      delete root.dataset.kairoTileDebug;
    };
  }, []);
  return null;
}
