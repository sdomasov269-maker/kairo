import type { WatchEpisode } from "@/data/watch/types";
import type { Anime } from "@/types/media";
import type { KodikWatchPlaybackDto } from "@/components/player/kodik/kodik-watch.types";

export async function resolveKodikRuntimeWatchEpisode(
  anime: Anime,
  seasonNumber: number,
  episodeNumber: number,
  resolvePlayback: (input: {
    anilistId?: number;
    malId?: number;
    year?: number;
    titles: {
      russian?: string;
      english?: string;
      romaji?: string;
      native?: string;
      aliases?: string[];
    };
    seasonNumber: number;
    episodeNumber: number;
  }) => Promise<KodikWatchPlaybackDto | null>,
) {
  const kodikPlayback = await resolvePlayback({
    ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
    ...(anime.malId ? { malId: anime.malId } : {}),
    ...(anime.year ? { year: anime.year } : {}),
    titles: {
      ...(anime.titleRu ? { russian: anime.titleRu } : {}),
      ...(anime.titleEnglish ? { english: anime.titleEnglish } : {}),
      ...(anime.titleRomaji ? { romaji: anime.titleRomaji } : {}),
      ...(anime.titleNative ? { native: anime.titleNative } : {}),
      aliases: anime.synonyms ?? [],
    },
    seasonNumber,
    episodeNumber,
  });
  const episode: WatchEpisode = {
    animeSlug: anime.slug,
    episodeNumber,
    titleRu: `Серия ${episodeNumber}`,
    titleEn: `Episode ${episodeNumber}`,
    descriptionRu: "",
    descriptionEn: "",
    sources: [],
    subtitles: [],
    audioTracks: [],
    chapters: [],
  };
  return { episode, kodikPlayback };
}
