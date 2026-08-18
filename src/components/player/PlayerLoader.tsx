"use client";

import dynamic from "next/dynamic";
import type { WatchEpisode } from "@/data/watch/types";
import type { KodikPlayerHandle } from "./kodik/kodik-player.types";

const KairoPlayer = dynamic(
  () => import("./KairoPlayer").then((module) => module.KairoPlayer),
  { ssr: false },
);

export function PlayerLoader(props: {
  episode: WatchEpisode;
  animeTitle: string;
  animePoster?: string;
  previousHref?: string;
  nextHref?: string;
  seasonNumber?: number;
  onHandle?: (handle: KodikPlayerHandle | null) => void;
  partyEvents?: {
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onTimeUpdate?: (time: number) => void;
    onSpeedChange?: (speed: number) => void;
  };
  onPlaybackError?: (reason?: "fatal" | "stall") => void;
}) {
  return <KairoPlayer {...props} />;
}
