export function unifiedWatchUrl(
  slug: string,
  seasonNumber: number,
  episodeNumber: number,
) {
  return `/anime/${encodeURIComponent(slug)}?season=${seasonNumber}&episode=${episodeNumber}#watch`;
}
