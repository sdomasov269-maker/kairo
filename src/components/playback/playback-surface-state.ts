import type { KairoPlaybackStatus } from "@/components/player/engine/types";

export type PlaybackOverlay = "loading" | "buffering" | "error" | null;

export function getPlaybackOverlay(status: KairoPlaybackStatus): PlaybackOverlay {
  if (status === "idle" || status === "loading") return "loading";
  if (status === "buffering") return "buffering";
  if (status === "error") return "error";
  return null;
}
