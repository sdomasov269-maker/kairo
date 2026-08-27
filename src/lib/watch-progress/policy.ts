export const WATCH_COMPLETION_PERCENT = 95;
export const WATCH_RESUME_MIN_SECONDS = 5;
export const WATCH_SAVE_INTERVAL_MS = 12_000;

export function canResumeWatchProgress(input: {
  currentTime: number;
  duration: number;
  percent: number;
  completed: boolean;
}) {
  return (
    !input.completed &&
    input.percent < WATCH_COMPLETION_PERCENT &&
    Number.isFinite(input.currentTime) &&
    Number.isFinite(input.duration) &&
    input.duration > 0 &&
    input.currentTime >= WATCH_RESUME_MIN_SECONDS
  );
}
