import type { EpisodeAvailability, EpisodeMetadata } from "@/domain/watch";
import type { Anime } from "@/types/media";
import type { AnimeSeasonDetails } from "../episode.service.ts";
import type {
  KodikAnimeSource,
  KodikResolverInput,
  KodikTranslationSource,
} from "./types.ts";

function selectEpisodeTranslation(
  source: KodikAnimeSource,
): KodikTranslationSource | null {
  const available = source.translations.filter(
    (translation) =>
      !translation.unavailable &&
      translation.seasons?.some((season) => season.episodes.length),
  );
  return (
    available.find((translation) => translation.type === "voice") ??
    available[0] ??
    null
  );
}

export function createKodikAnimeDetailSeasons(
  source: KodikAnimeSource | null,
  animeSlug: string,
): AnimeSeasonDetails[] {
  if (!source || source.type === "anime") return [];
  const translation = selectEpisodeTranslation(source);
  if (!translation?.seasons) return [];

  return translation.seasons
    .filter(
      (season) => Number.isSafeInteger(season.number) && season.number > 0,
    )
    .map((season) => ({
      id: `kodik-${animeSlug}-season-${season.number}`,
      seasonNumber: season.number,
      title: null,
      isPublished: true as const,
      episodes: season.episodes
        .filter(
          (episode) =>
            Number.isSafeInteger(episode.number) && episode.number > 0,
        )
        .sort((left, right) => left.number - right.number)
        .map((episode) => {
          const id = `kodik-${animeSlug}-s${season.number}-e${episode.number}`;
          const availability: EpisodeAvailability = episode.blocked
            ? "NO_VIDEO"
            : "AVAILABLE";
          const metadata: EpisodeMetadata = {
            id,
            animeSlug,
            seasonNumber: season.number,
            episodeNumber: episode.number,
            ...(episode.screenshots?.[0]
              ? { thumbnail: episode.screenshots[0] }
              : {}),
            metadataProviders: ["Kodik"],
            text: {
              ru: { ...(episode.title ? { title: episode.title } : {}) },
              en: { ...(episode.title ? { title: episode.title } : {}) },
            },
          };
          return {
            id,
            episodeNumber: episode.number,
            absoluteNumber: null,
            type: "REGULAR" as const,
            metadata,
            description: null,
            thumbnailUrl: episode.screenshots?.[0] ?? null,
            durationSeconds: null,
            airedAt: null,
            availableAt: null,
            availability,
            watchHref: episode.blocked
              ? null
              : `/watch/${animeSlug}/${episode.number}?season=${season.number}`,
          };
        }),
    }))
    .filter((season) => season.episodes.length > 0)
    .sort((left, right) => left.seasonNumber - right.seasonNumber);
}

export type KodikDetailProvider = {
  getAnimePlaybackData(
    input: KodikResolverInput,
  ): Promise<KodikAnimeSource | null>;
};

export async function resolveKodikAnimeDetailSeasonsWith(
  provider: KodikDetailProvider,
  anime: Anime,
) {
  try {
    const source = await provider.getAnimePlaybackData({
      ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
      ...(anime.malId ? { malId: anime.malId } : {}),
      ...(anime.year ? { year: anime.year } : {}),
      titles: {
        ...(anime.titleRu ? { russian: anime.titleRu } : {}),
        ...(anime.titleEnglish ? { english: anime.titleEnglish } : {}),
        ...(anime.titleRomaji ? { romaji: anime.titleRomaji } : {}),
        ...(anime.titleNative ? { native: anime.titleNative } : {}),
        aliases: [
          ...(anime.synonyms ?? []),
          ...(anime.localization?.ru?.synonyms ?? []),
          ...(anime.localization?.uk?.synonyms ?? []),
        ],
      },
    });
    return createKodikAnimeDetailSeasons(source, anime.slug);
  } catch {
    return [];
  }
}
