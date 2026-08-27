export function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "00:00";

  const totalSeconds = Math.floor(value);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(totalMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
