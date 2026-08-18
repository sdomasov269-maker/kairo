import type { Anime } from "@/types/media";

// One explicit contract prevents server/client day-boundary disagreements.
export const RELEASE_SCHEDULE_TIME_ZONE = "UTC";

export type ReleaseScheduleItem = {
  anime: Anime;
  episode: number;
  airingAt: number;
  href?: string;
};
export type ReleaseScheduleResult = {
  items: ReleaseScheduleItem[];
  available: boolean;
  start: string;
  end: string;
};
