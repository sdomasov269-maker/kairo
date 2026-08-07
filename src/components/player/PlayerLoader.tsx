"use client";

import dynamic from "next/dynamic";
import type { WatchEpisode } from "@/data/watch/types";

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
}) {
  return <KairoPlayer {...props} />;
}
