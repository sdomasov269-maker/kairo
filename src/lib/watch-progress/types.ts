export type WatchProgressEntry = {
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  percent: number;
  completed: boolean;
  updatedAt: string;
};
export type WatchProgressStore = { version: 2; entries: WatchProgressEntry[] };
