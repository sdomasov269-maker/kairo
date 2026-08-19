import "server-only";
import { KodikRustResolver } from "./providers/kodik-rust.resolver";
import { KodikWrapperResolver } from "./providers/kodik-wrapper.resolver";
import type { DirectPlaybackResolver, PlaybackDescriptor } from "./types";

const enabled = () => process.env.KAIRO_DIRECT_KODIK_PLAYBACK === "true";

export class PlaybackResolverService {
  constructor(private readonly resolvers: DirectPlaybackResolver[] = [new KodikWrapperResolver(), new KodikRustResolver()]) {}
  async resolve(link: string): Promise<PlaybackDescriptor> {
    if (!enabled()) return { mode: "kodik-iframe", provider: "kodik-iframe", iframeUrl: link };
    for (const resolver of this.resolvers) {
      try {
        const result = await resolver.resolve({ link });
        if (result.sources.length) {
          if (process.env.NODE_ENV === "development") console.info("[KairoPlayback]", { resolver: resolver.name, qualities: result.sources.map((source) => source.quality), mode: "direct" });
          return { mode: "direct", provider: resolver.name, ...result };
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.warn("[KairoPlayback] resolver failed", { resolver: resolver.name, error: error instanceof Error ? error.message : "unknown" });
      }
    }
    return { mode: "kodik-iframe", provider: "kodik-iframe", iframeUrl: link };
  }
}

export const playbackResolverService = new PlaybackResolverService();
