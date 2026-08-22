import type { DirectPlaybackResolver } from "../../types";
import type { KodikAnimeSource, KodikMatchConfidence, KodikResolverInput, KodikTranslationSource } from "@/server/services/kodik/types";
import type { PlaybackCandidate, PlaybackProvider, ProviderResolveInput, StreamType } from "../../core/types";

export type KodikPlaybackLookup = {
  getAnimePlaybackData(input: KodikResolverInput): Promise<KodikAnimeSource | null>;
};

const MATCH_CONFIDENCE: Record<KodikMatchConfidence, number> = {
  EXACT_EXTERNAL_ID: 1,
  EXACT_TITLE_AND_YEAR: 0.9,
  EXACT_TITLE: 0.85,
  FUZZY_TITLE: 0.7,
};

function playerLink(translation: KodikTranslationSource, source: KodikAnimeSource, input: ProviderResolveInput) {
  if (translation.unavailable) return null;
  if (source.type === "anime") return translation.playerLink;
  const season = translation.seasons?.find((item) => item.number === input.season);
  return season?.episodes.find((item) => item.number === input.episode && !item.blocked)?.playerLink ?? null;
}

function streamType(mimeType: string, url: string): StreamType {
  if (mimeType.includes("dash") || /\.mpd(?:$|\?)/i.test(url)) return "dash";
  if (mimeType.includes("mpegurl") || /\.m3u8(?:$|\?)/i.test(url)) return "hls";
  return "mp4";
}

function numericQuality(value: string) {
  const quality = Number.parseInt(value, 10);
  return Number.isFinite(quality) ? quality : undefined;
}

export class KodikProvider implements PlaybackProvider {
  readonly id = "kodik";
  readonly name = "Kodik";
  private readonly lookup: KodikPlaybackLookup;
  private readonly resolver: DirectPlaybackResolver;

  constructor(lookup: KodikPlaybackLookup, resolver: DirectPlaybackResolver) {
    this.lookup = lookup;
    this.resolver = resolver;
  }

  async resolveEpisode(input: ProviderResolveInput, signal?: AbortSignal): Promise<PlaybackCandidate[]> {
    signal?.throwIfAborted();
    const startedAt = performance.now();
    const source = await this.lookup.getAnimePlaybackData({
      ...(input.anime.anilistId ? { anilistId: input.anime.anilistId } : {}),
      ...(input.anime.malId ? { malId: input.anime.malId } : {}),
      ...(input.anime.shikimoriId ? { shikimoriId: input.anime.shikimoriId } : {}),
      ...(input.anime.year ? { year: input.anime.year } : {}),
      titles: {
        ...(input.anime.russianTitle ? { russian: input.anime.russianTitle } : {}),
        ...((input.anime.englishTitle ?? input.anime.title) ? { english: input.anime.englishTitle ?? input.anime.title } : {}),
        ...(input.anime.romajiTitle ? { romaji: input.anime.romajiTitle } : {}),
        ...(input.anime.nativeTitle ? { native: input.anime.nativeTitle } : {}),
        aliases: input.anime.aliases,
      },
    });
    if (!source) return [];

    const translationResults = await Promise.allSettled(
      source.translations.map(async (translation) => {
        const link = playerLink(translation, source, input);
        if (!link) return [];
        signal?.throwIfAborted();
        const resolved = await this.resolver.resolve({ link });
        signal?.throwIfAborted();
        return resolved.sources.map((stream, index): PlaybackCandidate => ({
          id: `${this.id}:${source.kodikId}:${translation.id}:${input.season ?? 0}:${input.episode ?? 0}:${stream.quality}:${index}`,
          provider: { id: this.id, name: this.name },
          animeId: input.anime.id,
          ...(input.season !== undefined ? { season: input.season } : {}),
          ...(input.episode !== undefined ? { episode: input.episode } : {}),
          stream: { type: streamType(stream.mimeType, stream.url), url: stream.url },
          video: { ...(numericQuality(stream.quality) !== undefined ? { quality: numericQuality(stream.quality) } : {}) },
          audio: { language: "ru", translation: translation.title, translationType: translation.type },
          matchConfidence: MATCH_CONFIDENCE[source.match],
          metadata: { externalId: source.kodikId, providerTitle: source.title },
          diagnostics: { resolveLatencyMs: Math.round(performance.now() - startedAt) },
        }));
      }),
    );

    return translationResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
}
