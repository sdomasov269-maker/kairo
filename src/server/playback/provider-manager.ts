import "server-only";

import type { PlaybackDescriptor } from "../../lib/playback/descriptor";
import {
  getAnimegoVoices,
  resolveAnimegoPlayback,
  resolveAnimegoTitle,
} from "./animego-cvh-provider-client";
import {
  PlaybackProviderError,
  resolveKodikPlayback,
} from "./kodik-provider-client";
import {
  rankDefaultTranslations,
  selectFallbackTranslation,
  type TranslationMatch,
} from "./translation-matching";

export type PlaybackIdentity = {
  shikimoriId: number;
  titles: string[];
  year?: number;
  mediaType?: string;
};

export type PlaybackResolveInput = PlaybackIdentity & {
  episode: number;
  translationId?: string;
  preferredTranslationName?: string;
  simulateKodikFailure?: string;
  simulateCvhFailure?: string;
};

export type ManagedPlaybackDescriptor = PlaybackDescriptor & {
  fallbackUsed: boolean;
  diagnostics: {
    primaryFailureCode: string | null;
    translationMatch: TranslationMatch | null;
  };
};

export interface PlaybackProvider {
  id: "kodik" | "animego-cvh";
  resolvePlayback(input: PlaybackResolveInput): Promise<PlaybackDescriptor>;
}

const FALLBACK_ELIGIBLE = new Set([
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "TITLE_NOT_FOUND",
  "NOT_FOUND",
  "NO_TRANSLATIONS",
  "NO_SOURCE",
  "NO_CVH_VOICE",
  "NO_CVH_STREAM",
  "UPSTREAM_REJECTED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_UNAVAILABLE",
  "RESOLVE_FAILED",
  "PROVIDER_ERROR",
]);

function providerError(error: unknown) {
  return error instanceof PlaybackProviderError
    ? error
    : new PlaybackProviderError(
        "INTERNAL_CONTRACT_ERROR",
        "Playback provider contract failed",
        502,
      );
}

function debug(message: string) {
  if (process.env.NODE_ENV !== "production")
    console.info(`[playback-manager] ${message}`);
}

export function createPlaybackManager(
  dependencies = {
    kodik: async (input: PlaybackResolveInput) =>
      resolveKodikPlayback({
        shikimoriId: input.shikimoriId,
        episode: input.episode,
        translationId: input.translationId,
        timeoutMs: 5_000,
      }),
    animegoTitle: resolveAnimegoTitle,
    animegoVoices: getAnimegoVoices,
    animegoPlayback: resolveAnimegoPlayback,
  },
) {
  return {
    async resolve(
      input: PlaybackResolveInput,
    ): Promise<ManagedPlaybackDescriptor> {
      debug("resolve start");
      debug("trying kodik");
      try {
        if (input.simulateKodikFailure)
          throw new PlaybackProviderError(
            input.simulateKodikFailure,
            "Simulated Kodik failure",
            503,
          );
        const descriptor = await dependencies.kodik(input);
        debug("kodik success");
        return {
          ...descriptor,
          fallbackUsed: false,
          diagnostics: { primaryFailureCode: null, translationMatch: null },
        };
      } catch (reason) {
        const primary = providerError(reason);
        debug(`kodik failed code=${primary.code}`);
        if (!FALLBACK_ELIGIBLE.has(primary.code)) throw primary;
        debug("trying animego-cvh");
        try {
          const fallbackDeadline = Date.now() + 22_000;
          const remaining = (maximum: number) =>
            Math.max(1_000, Math.min(maximum, fallbackDeadline - Date.now()));
          if (input.simulateCvhFailure)
            throw new PlaybackProviderError(
              input.simulateCvhFailure,
              "Playback unavailable",
              503,
            );
          const title = await dependencies.animegoTitle({
            titles: input.titles,
            year: input.year,
            mediaType: input.mediaType,
            timeoutMs: remaining(8_000),
          });
          const voices = await dependencies.animegoVoices(
            title.id,
            input.episode,
            remaining(6_000),
          );
          const candidates = voices.voices.map((voice) => ({
            id: voice.translationId,
            name: voice.name,
              type: "voice" as const,
            episodeAvailable: voice.episodeAvailable,
            episodeCoverage: voice.episodeCoverage,
          }));
          const initial = selectFallbackTranslation(
            candidates,
            input.preferredTranslationName,
          );
          const attempts = [
            initial.translation,
            ...rankDefaultTranslations(candidates).filter(
              (candidate) =>
                candidate.episodeAvailable &&
                candidate.id !== initial.translation.id,
            ),
          ];
          let descriptor: PlaybackDescriptor | undefined;
          let match = initial.match;
          let lastError: unknown;
          for (const candidate of attempts) {
            try {
              descriptor = await dependencies.animegoPlayback({
                animeId: title.id,
                episode: input.episode,
                translationId: candidate.id,
                timeoutMs: remaining(8_000),
              });
              if (candidate.id !== initial.translation.id)
                match = {
                  requestedName: input.preferredTranslationName || null,
                  selectedName: candidate.name,
                  strategy: "default",
                  confidence: 0,
                  changed: Boolean(input.preferredTranslationName),
                };
              break;
            } catch (error) {
              lastError = error;
              if (Date.now() >= fallbackDeadline) break;
            }
          }
          if (!descriptor) throw lastError;
          debug("animego-cvh success");
          return {
            ...descriptor,
            fallbackUsed: true,
            diagnostics: {
              primaryFailureCode: primary.code,
              translationMatch: match,
            },
          };
        } catch (fallbackReason) {
          const fallback = providerError(fallbackReason);
          throw new PlaybackProviderError(
            "PLAYBACK_UNAVAILABLE",
            "Playback is temporarily unavailable",
            fallback.status >= 500 ? 503 : fallback.status,
          );
        }
      }
    },
  };
}

export const playbackManager = createPlaybackManager();
