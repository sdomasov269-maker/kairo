import type { KodikAnimeSource, KodikResolverInput } from "./types.ts";
import type {
  KodikWatchPlaybackDto,
  KodikWatchTranslationDto,
} from "./watch-types";

function resolveTranslation(
  source: KodikAnimeSource,
  translation: KodikAnimeSource["translations"][number],
  seasonNumber: number,
  episodeNumber: number,
): KodikWatchTranslationDto {
  if (translation.unavailable)
    return {
      id: translation.id,
      title: translation.title,
      type: translation.type,
      available: false,
    };
  if (source.type === "anime")
    return {
      id: translation.id,
      title: translation.title,
      type: translation.type,
      available: true,
      playerLink: translation.playerLink,
    };
  const season = translation.seasons?.find(
    (item) => item.number === seasonNumber,
  );
  const episode = season?.episodes.find(
    (item) => item.number === episodeNumber,
  );
  if (!episode || episode.blocked)
    return {
      id: translation.id,
      title: translation.title,
      type: translation.type,
      available: false,
    };
  return {
    id: translation.id,
    title: translation.title,
    type: translation.type,
    available: true,
    playerLink: episode.playerLink,
  };
}

export function createKodikWatchPlaybackDto(
  source: KodikAnimeSource | null,
  seasonNumber: number,
  episodeNumber: number,
): KodikWatchPlaybackDto | null {
  if (!source) return null;
  const translations = source.translations.map((translation) =>
    resolveTranslation(source, translation, seasonNumber, episodeNumber),
  );
  const playable = translations.filter(
    (
      translation,
    ): translation is KodikWatchTranslationDto & { playerLink: string } =>
      translation.available && Boolean(translation.playerLink),
  );
  const selected =
    playable.find((translation) => translation.type === "voice") ?? playable[0];
  if (!selected) return null;
  return {
    provider: "kodik",
    kodikId: source.kodikId,
    playerLink: selected.playerLink,
    translation: {
      id: selected.id,
      title: selected.title,
      type: selected.type,
    },
    translations,
    season: source.type === "anime" ? null : seasonNumber,
    episode: source.type === "anime" ? null : episodeNumber,
  };
}

export type KodikWatchResolverInput = KodikResolverInput & {
  seasonNumber: number;
  episodeNumber: number;
};

export type KodikPlaybackProvider = {
  getAnimePlaybackData(
    input: KodikResolverInput,
  ): Promise<KodikAnimeSource | null>;
};

export async function resolveKodikWatchPlaybackWith(
  provider: KodikPlaybackProvider,
  input: KodikWatchResolverInput,
): Promise<KodikWatchPlaybackDto | null> {
  try {
    const source = await provider.getAnimePlaybackData(input);
    return createKodikWatchPlaybackDto(
      source,
      input.seasonNumber,
      input.episodeNumber,
    );
  } catch {
    return null;
  }
}
