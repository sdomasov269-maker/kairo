import type { AnimeMediaProvider } from "./types.ts";
import { assertProviderSupported, type ProviderAuthorization } from "./policy.ts";

type Entry = { provider: AnimeMediaProvider; authorization: ProviderAuthorization; priority: number };
export class AnimeMediaProviderRegistry {
  private readonly entries = new Map<string, Entry>();
  register(provider: AnimeMediaProvider, authorization: ProviderAuthorization, priority = 100) { assertProviderSupported(provider, authorization); if (this.entries.has(provider.key)) throw new Error(`Duplicate provider key: ${provider.key}`); this.entries.set(provider.key, { provider, authorization, priority }); return this; }
  get(key: string) { return this.entries.get(key)?.provider ?? null; }
  ordered() { return [...this.entries.values()].sort((a, b) => a.priority - b.priority).map((entry) => entry.provider); }
  async healthy() { const result = []; for (const provider of this.ordered()) { const health = await provider.healthCheck().catch(() => ({ status: "UNAVAILABLE" as const, checkedAt: new Date().toISOString() })); if (health.status === "HEALTHY" || health.status === "DEGRADED") result.push(provider); } return result; }
}
