export type EpisodeAvailability =
  "AVAILABLE" | "COMING_SOON" | "NO_VIDEO" | "UNPUBLISHED" | "SOURCE_DISABLED";

export function getEpisodeAvailability(
  episode: {
    isPublished: boolean;
    availableAt: Date | null;
    videoSources: Array<{ isActive: boolean }>;
  },
  now = new Date(),
): EpisodeAvailability {
  if (!episode.isPublished) return "UNPUBLISHED";
  if (episode.availableAt && episode.availableAt > now) return "COMING_SOON";
  if (episode.videoSources.some((source) => source.isActive))
    return "AVAILABLE";
  if (episode.videoSources.length) return "SOURCE_DISABLED";
  return "NO_VIDEO";
}
