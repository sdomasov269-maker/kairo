"use client";

import dynamic from "next/dynamic";
import type { WatchEpisode } from "@/data/watch/types";
import type { KodikPlayerHandle } from "./kodik/kodik-player.types";

const HlsKairoPlayer = dynamic(
  () => import("./HlsKairoPlayer").then((module) => module.HlsKairoPlayer),
  { ssr: false },
);

export function PlayerLoader(props: {
  episode: WatchEpisode;
  directSources?: { quality: number; url: string; mimeType: string }[];
  debug?: boolean;
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
  return <HlsKairoPlayer {...props} />;
}
