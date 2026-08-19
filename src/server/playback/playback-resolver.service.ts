import "server-only";
import { KodikRustResolver } from "./providers/kodik-rust.resolver";
import { KodikWrapperResolver } from "./providers/kodik-wrapper.resolver";
import { canonicalizeKodikPlayerLink } from "./providers/kodik-link";
import type { DirectPlaybackResolver, PlaybackDescriptor } from "./types";

const enabled = () => process.env.KAIRO_DIRECT_KODIK_PLAYBACK === "true";
const DIRECT_CACHE_TTL_MS = 5 * 60_000;
const DIRECT_STALE_IF_ERROR_TTL_MS = 15 * 60_000;
type DirectCacheEntry = {
  playback: Extract<PlaybackDescriptor, { mode: "direct" }>;
  cachedAt: number;
};

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

function knownUrlExpiry(url: string): number | null {
  try {
    const value = new URL(url);
    for (const name of ["expires", "expiry", "exp", "expire", "e"]) {
      const raw = value.searchParams.get(name);
      if (!raw || !/^\d{10,13}$/.test(raw)) continue;
      const timestamp = Number(raw);
      return raw.length === 10 ? timestamp * 1_000 : timestamp;
    }
  } catch {}
  return null;
}

function usableStale(entry: DirectCacheEntry, now: number) {
  if (now - entry.cachedAt >= DIRECT_STALE_IF_ERROR_TTL_MS) return false;
  return entry.playback.sources.every((source) => {
    const expiry = knownUrlExpiry(source.url);
    return expiry === null || expiry > now;
  });
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
      debug("direct cache hit", { key, state: "fresh", ageMs: now - cached.cachedAt });
      return cached.playback;
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      debug("in-flight dedupe hit", { key });
      return pending;
    }
    const stale = cached && usableStale(cached, now) ? cached : undefined;
    if (cached && !stale) {
      this.directCache.delete(key);
      debug("stale direct rejected", {
        key,
        reason: now - cached.cachedAt >= DIRECT_STALE_IF_ERROR_TTL_MS ? "stale-window-ended" : "expired-url",
      });
    }
    if (stale) debug("direct cache stale", { key, ageMs: now - stale.cachedAt });
    else debug("direct cache miss", { key });
    const execution = this.resolveUncached(link, key)
      .then((playback) => {
        if (playback.mode === "direct") {
          if (stale) debug("direct refresh success", { key });
          return playback;
        }
        if (stale) {
          debug("stale direct fallback", { key, ageMs: now - stale.cachedAt, reason: "refresh-failed" });
          return stale.playback;
        }
        debug("iframe fallback", { key, reason: "no-usable-direct-descriptor" });
        return playback;
      })
      .catch((error) => {
        if (stale) {
          debug("stale direct fallback", { key, ageMs: now - stale.cachedAt, reason: error instanceof Error ? error.message : "refresh-failed" });
          return stale.playback;
        }
        debug("iframe fallback", { key, reason: "no-usable-direct-descriptor" });
        return { mode: "kodik-iframe", provider: "kodik-iframe", iframeUrl: link } as PlaybackDescriptor;
      })
      .finally(() => this.inFlight.delete(key));
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
