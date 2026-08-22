import "server-only";
import type { Anime } from "@/types/media";
import { kodikService } from "@/server/services/kodik.service";
import { SourceAggregator } from "./core/SourceAggregator";
import { SourceScorer } from "./core/SourceScorer";
import type { ProviderResolveInput } from "./core/types";
import type { PlaybackSource } from "./playback-source";
import { KodikProvider } from "./providers/kodik/KodikProvider";
import { KodikWrapperResolver } from "./providers/kodik-wrapper.resolver";
import { PlaybackSessionManager } from "./session/PlaybackSessionManager";
import type { PlaybackSession } from "./session/types";
import { playbackSessionManager } from "./playback.runtime";

export { playbackSessionManager, segmentCache, streamResourceStore } from "./playback.runtime";

// The minimal page intentionally has no episode UI. This is its one temporary default.
export const DEFAULT_PLAYBACK_EPISODE = 1;
const DEFAULT_PLAYBACK_SEASON = 1;

export type PlaybackPreferences = {
  season?: number;
  episode?: number;
  preferredLanguage?: string;
  preferredTranslation?: string;
};

export function createProviderResolveInput(
  anime: Anime,
  preferences: PlaybackPreferences = {},
): ProviderResolveInput {
  return {
    anime: {
      id: anime.id,
      title: anime.title,
      ...(anime.titleEnglish ? { englishTitle: anime.titleEnglish } : {}),
      ...(anime.titleRomaji ? { romajiTitle: anime.titleRomaji } : {}),
      ...(anime.titleNative ? { nativeTitle: anime.titleNative } : {}),
      ...(anime.titleRu ? { russianTitle: anime.titleRu } : {}),
      ...(anime.titleUk ? { ukrainianTitle: anime.titleUk } : {}),
      aliases: anime.synonyms ?? [],
      ...(anime.year ? { year: anime.year } : {}),
      ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
      ...(anime.malId ? { malId: anime.malId } : {}),
    },
    season: preferences.season ?? DEFAULT_PLAYBACK_SEASON,
    episode: preferences.episode ?? DEFAULT_PLAYBACK_EPISODE,
    preferredLanguage: preferences.preferredLanguage ?? "ru",
    ...(preferences.preferredTranslation
      ? { preferredTranslation: preferences.preferredTranslation }
      : {}),
  };
}

export class PlaybackService {
  private readonly aggregator: SourceAggregator;
  private readonly scorer: SourceScorer;
  private readonly sessionManager: PlaybackSessionManager;

  constructor(
    aggregator: SourceAggregator,
    scorer: SourceScorer,
    sessionManager: PlaybackSessionManager,
  ) {
    this.aggregator = aggregator;
    this.scorer = scorer;
    this.sessionManager = sessionManager;
  }

  async createPlaybackSession(
    anime: Anime,
    preferences: PlaybackPreferences = {},
    signal?: AbortSignal,
  ): Promise<PlaybackSession | null> {
    if (process.env.NODE_ENV === "development")
      console.info("[KairoPlayback] session.create.start");
    const input = createProviderResolveInput(anime, preferences);
    const candidates = await this.aggregator.resolve(input, signal);
    const ranked = this.scorer.rank(candidates, input);
    const selected = ranked[0];
    if (!selected) return null;

    if (process.env.NODE_ENV === "development")
      console.info(`[KairoPlayback] selected provider=${selected.candidate.provider.id} score=${selected.score.toFixed(2)}`);

    const session = await this.sessionManager.create(
      {
        animeId: anime.id,
        ...(input.season !== undefined ? { season: input.season } : {}),
        ...(input.episode !== undefined ? { episode: input.episode } : {}),
      },
      ranked.map((item) => item.candidate),
    );
    if (session && process.env.NODE_ENV === "development")
      console.info(
        `[KairoPlayback] session.create.success id=${session.id.slice(0, 8)} fallbacks=${session.fallbacks.length}`,
      );
    return session;
  }

  async resolvePlaybackSource(anime: Anime, signal?: AbortSignal): Promise<PlaybackSource | null> {
    const session = await this.createPlaybackSession(anime, {}, signal);
    if (!session) return null;

    return session.primary.stream.type === "hls"
      ? {
          url: `/api/stream/${encodeURIComponent(session.id)}/master.m3u8`,
          type: "hls",
        }
      : null;
  }
}

const providers = [new KodikProvider(kodikService, new KodikWrapperResolver())];
export const playbackService = new PlaybackService(
  new SourceAggregator(providers),
  new SourceScorer(),
  playbackSessionManager,
);
