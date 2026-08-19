import "server-only";
import { KodikRustResolver } from "./providers/kodik-rust.resolver";
import { KodikWrapperResolver } from "./providers/kodik-wrapper.resolver";
import { canonicalizeKodikPlayerLink } from "./providers/kodik-link";
import type { DirectPlaybackResolver, PlaybackDescriptor } from "./types";

const enabled = () => process.env.KAIRO_DIRECT_KODIK_PLAYBACK === "true";
const DIRECT_CACHE_TTL_MS = 5 * 60_000;
type DirectCacheEntry = { playback: PlaybackDescriptor; cachedAt: number };

function isDebug() {
  return process.env.KAIRO_PLAYBACK_DEBUG === "true";
}

function debug(stage: string, data: Record<string, unknown>) {
  if (isDebug()) console.info(`[KairoPlayback] ${stage}`, data);
}

function cacheKey(link: string) {
  try {
    return canonicalizeKodikPlayerLink(link);
  } catch {
    return link;
  }
}

export class PlaybackResolverService {
  private readonly directCache = new Map<string, DirectCacheEntry>();
  private readonly inFlight = new Map<string, Promise<PlaybackDescriptor>>();
  private readonly resolvers: DirectPlaybackResolver[];

  constructor(resolvers: DirectPlaybackResolver[] = [new KodikWrapperResolver(), new KodikRustResolver()]) {
    this.resolvers = resolvers;
  }

  async resolve(link: string): Promise<PlaybackDescriptor> {
    if (!enabled()) return { mode: "kodik-iframe", provider: "kodik-iframe", iframeUrl: link };
    const key = cacheKey(link);
    const now = Date.now();
    const cached = this.directCache.get(key);
    if (cached && now - cached.cachedAt < DIRECT_CACHE_TTL_MS) {
      debug("direct cache hit", { key, ageMs: now - cached.cachedAt });
      return cached.playback;
    }
    if (cached) this.directCache.delete(key);
    const pending = this.inFlight.get(key);
    if (pending) {
      debug("in-flight dedupe hit", { key });
      return pending;
    }
    debug("direct cache miss", { key });
    const execution = this.resolveUncached(link, key).finally(() =>
      this.inFlight.delete(key),
    );
    this.inFlight.set(key, execution);
    return execution;
  }

  private async resolveUncached(link: string, key: string): Promise<PlaybackDescriptor> {
    for (const resolver of this.resolvers) {
      try {
        debug("resolver execution", { key, resolver: resolver.name, attempt: 1 });
        const result = await resolver.resolve({ link });
        if (result.sources.length) {
          const playback: PlaybackDescriptor = { mode: "direct", provider: resolver.name, ...result };
          this.directCache.set(key, { playback, cachedAt: Date.now() });
          if (isDebug()) console.info("[KairoPlayback]", { resolver: resolver.name, qualities: result.sources.map((source) => source.quality), mode: "direct" });
          return playback;
        }
      } catch (error) {
        if (isDebug()) console.warn("[KairoPlayback] resolver failed", { resolver: resolver.name, error: error instanceof Error ? error.message : "unknown" });
      }
    }
    return { mode: "kodik-iframe", provider: "kodik-iframe", iframeUrl: link };
  }

  clearCache() {
    this.directCache.clear();
    this.inFlight.clear();
  }
}

export const playbackResolverService = new PlaybackResolverService();
