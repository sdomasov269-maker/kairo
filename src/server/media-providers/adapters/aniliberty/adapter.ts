import type {
  AnimeMediaProvider,
  ProviderAnimeSearchInput,
  ProviderPlaybackRequest,
} from "../../types.ts";
import { AniLibertyClient } from "./client.ts";
import { AniLibertyNotFoundError } from "./errors.ts";
import {
  mapAniLibertyEpisode,
  mapAniLibertyRelease,
  mapAniLibertySearchItem,
} from "./mapper.ts";
import { anilibertyCapabilities } from "./policy.ts";

export class AniLibertyMediaProvider implements AnimeMediaProvider {
  readonly key = "aniliberty";
  readonly name = "AniLiberty";
  readonly capabilities = anilibertyCapabilities;
  private readonly client: AniLibertyClient;
  constructor(client = new AniLibertyClient()) {
    this.client = client;
  }
  async healthCheck() {
    const checkedAt = new Date().toISOString();
    const started = Date.now();
    try {
      await this.client.healthCheck();
      return {
        status: "HEALTHY" as const,
        checkedAt,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        status: "DEGRADED" as const,
        checkedAt,
        latencyMs: Date.now() - started,
        message:
          error instanceof Error ? error.message : "AniLiberty unavailable",
      };
    }
  }
  async searchAnime(input: ProviderAnimeSearchInput) {
    return (await this.client.searchTitles(input.title)).map(
      mapAniLibertySearchItem,
    );
  }
  async getAnime(providerAnimeId: string) {
    try {
      return mapAniLibertyRelease(
        await this.client.getTitleById(providerAnimeId),
      );
    } catch (error) {
      if (error instanceof AniLibertyNotFoundError) return null;
      throw error;
    }
  }
  async getEpisodes(providerAnimeId: string) {
    return (await this.client.getTitleEpisodes(providerAnimeId)).map(
      mapAniLibertyEpisode,
    );
  }
  async getPlayback(input: ProviderPlaybackRequest) {
    void input;
    return null;
  }
  async getUpdates(cursor?: string) {
    const schedule = await this.client.getSchedule();
    return {
      cursor,
      updates: schedule.data.map((item, index) => ({
        providerAnimeId: String((item as { id?: unknown }).id ?? index),
        type: "ANIME" as const,
        occurredAt: new Date().toISOString(),
      })),
    };
  }
}
