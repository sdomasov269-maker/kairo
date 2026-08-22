import type { PlaybackCandidate, PlaybackProvider, ProviderResolveInput } from "./types";

function developmentLog(message: string) {
  if (process.env.NODE_ENV === "development") console.info(`[KairoPlayback] ${message}`);
}

export class SourceAggregator {
  private readonly providers: readonly PlaybackProvider[];

  constructor(providers: readonly PlaybackProvider[]) {
    this.providers = providers;
  }

  async resolve(input: ProviderResolveInput, signal?: AbortSignal): Promise<PlaybackCandidate[]> {
    signal?.throwIfAborted();
    developmentLog(`aggregate.start providers=${this.providers.length}`);

    const settled = await Promise.allSettled(
      this.providers.map(async (provider) => {
        const startedAt = performance.now();
        developmentLog(`provider=${provider.id} resolve.start`);
        try {
          const candidates = await provider.resolveEpisode(input, signal);
          developmentLog(`provider=${provider.id} resolve.success candidates=${candidates.length} latency=${Math.round(performance.now() - startedAt)}ms`);
          return candidates;
        } catch (error) {
          developmentLog(`provider=${provider.id} resolve.failed reason=${error instanceof Error ? error.name : "unknown"}`);
          throw error;
        }
      }),
    );

    signal?.throwIfAborted();
    const candidates = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    developmentLog(`aggregate.success candidates=${candidates.length}`);
    return candidates;
  }
}
