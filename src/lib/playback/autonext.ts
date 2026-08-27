export const AUTONEXT_COUNTDOWN_SECONDS = 8;

export function getNextEpisode(
  currentEpisode: number,
  episodeCount?: number,
): number | null {
  if (
    !Number.isInteger(currentEpisode) ||
    currentEpisode < 1 ||
    !Number.isInteger(episodeCount) ||
    !episodeCount ||
    currentEpisode >= episodeCount
  )
    return null;
  return currentEpisode + 1;
}
