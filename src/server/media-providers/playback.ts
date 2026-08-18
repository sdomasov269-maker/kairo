import type { AnimeMediaProvider, ProviderPlaybackRequest } from "./types.ts";
import { validateProviderPlayback } from "./policy.ts";
export async function resolveProviderPlayback(
  providers: AnimeMediaProvider[],
  input: ProviderPlaybackRequest,
) {
  const failures: Array<{ provider: string; reason: string }> = [];
  for (const provider of providers) {
    try {
      const health = await provider.healthCheck();
      if (health.status === "UNAVAILABLE" || health.status === "UNSUPPORTED") {
        failures.push({ provider: provider.key, reason: health.status });
        continue;
      }
      const playback = await provider.getPlayback(input);
      if (playback)
        return {
          provider: provider.key,
          playback: validateProviderPlayback(playback),
          failures,
        };
      failures.push({ provider: provider.key, reason: "NO_PLAYBACK" });
    } catch (error) {
      failures.push({
        provider: provider.key,
        reason: error instanceof Error ? error.name : "ERROR",
      });
    }
  }
  return { provider: null, playback: null, failures };
}
