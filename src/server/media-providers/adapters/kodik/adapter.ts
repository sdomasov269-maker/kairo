import type { AnimeMediaProvider, ProviderAnimeSearchInput, ProviderPlayback, ProviderPlaybackRequest } from "../../types.ts";
import { KodikClient } from "./client.ts";
import { KodikPartnerAccessRequiredError } from "./errors.ts";
import { kodikCapabilities, KODIK_POLICY_STATUS } from "./policy.ts";
export class KodikMediaProvider implements AnimeMediaProvider {
  readonly key = "kodik"; readonly name = "Kodik"; readonly capabilities = kodikCapabilities;
  private readonly client: KodikClient;
  constructor(client = new KodikClient()) { this.client = client; }
  async healthCheck() { return { status: "UNSUPPORTED" as const, checkedAt: new Date().toISOString(), message: KODIK_POLICY_STATUS }; }
  async searchAnime(input: ProviderAnimeSearchInput) { void input; this.client.searchTitles(); return []; }
  async getAnime(providerAnimeId: string) { void providerAnimeId; this.client.getTitle(); return null; }
  async getEpisodes(providerAnimeId: string) { void providerAnimeId; this.client.getEpisodes(); return []; }
  async getPlayback(input: ProviderPlaybackRequest): Promise<ProviderPlayback | null> { void input; throw new KodikPartnerAccessRequiredError("Kodik playback is disabled pending written permission"); }
}
export function createKodikProviderIfAuthorized() { return null; }
