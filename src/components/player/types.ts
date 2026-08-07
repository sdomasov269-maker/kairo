export interface PlayerProgress {
  animeSlug: string;
  episode: number;
  currentTime: number;
  duration: number;
  updatedAt: string;
  completed: boolean;
}
export interface QualityOption {
  height: number;
  width: number | null;
  bandwidth: number | null;
}
