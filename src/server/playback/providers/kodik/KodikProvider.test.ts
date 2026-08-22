import assert from "node:assert/strict";
import test from "node:test";
import { KodikProvider } from "./KodikProvider.ts";
import type { ProviderResolveInput } from "../../core/types.ts";
import type { KodikAnimeSource } from "@/server/services/kodik/types";

const input: ProviderResolveInput = {
  anime: {
    id: "anilist-269",
    title: "BLEACH",
    russianTitle: "Блич",
    englishTitle: "BLEACH",
    aliases: ["Bleach"],
    year: 2004,
    anilistId: 269,
    malId: 269,
  },
  season: 1,
  episode: 1,
};

const kodikSource: KodikAnimeSource = {
  provider: "kodik",
  kodikId: "bleach-kodik",
  match: "EXACT_TITLE_AND_YEAR",
  title: "Bleach",
  year: 2004,
  type: "anime-serial",
  translations: [{
    id: 10,
    title: "Studio Voice",
    type: "voice",
    playerLink: "https://kodik.info/serial",
    blockedCountries: [],
    unavailable: false,
    seasons: [{ number: 1, episodes: [{ number: 1, playerLink: "https://kodik.info/episode-1", blocked: false }] }],
  }],
};

test("normalizes Kodik metadata and every resolved quality into candidates", async () => {
  let lookupInput: unknown;
  let resolverLink: string | undefined;
  const provider = new KodikProvider(
    { getAnimePlaybackData: async (value) => { lookupInput = value; return kodikSource; } },
    { name: "mock", resolve: async ({ link }) => {
      resolverLink = link;
      return { sources: [
        { quality: "1080", url: "https://media.example/1080.m3u8", mimeType: "application/x-mpegURL" },
        { quality: "720", url: "https://media.example/720.m3u8", mimeType: "application/x-mpegURL" },
      ] };
    } },
  );

  const candidates = await provider.resolveEpisode(input);
  assert.equal(candidates.length, 2);
  assert.equal(resolverLink, "https://kodik.info/episode-1");
  assert.deepEqual(lookupInput, {
    anilistId: 269,
    malId: 269,
    year: 2004,
    titles: { russian: "Блич", english: "BLEACH", aliases: ["Bleach"] },
  });
  assert.deepEqual(candidates[0], {
    id: "kodik:bleach-kodik:10:1:1:1080:0",
    provider: { id: "kodik", name: "Kodik" },
    animeId: "anilist-269",
    season: 1,
    episode: 1,
    stream: { type: "hls", url: "https://media.example/1080.m3u8" },
    video: { quality: 1080 },
    audio: { language: "ru", translation: "Studio Voice", translationType: "voice" },
    matchConfidence: 0.9,
    metadata: { externalId: "bleach-kodik", providerTitle: "Bleach" },
    diagnostics: { resolveLatencyMs: candidates[0]!.diagnostics!.resolveLatencyMs },
  });
});

test("isolates a failed translation and keeps candidates from another translation", async () => {
  const source = { ...kodikSource, translations: [
    kodikSource.translations[0]!,
    { ...kodikSource.translations[0]!, id: 11, title: "Second Voice", seasons: [{ number: 1, episodes: [{ number: 1, playerLink: "https://kodik.info/second", blocked: false }] }] },
  ] };
  const provider = new KodikProvider(
    { getAnimePlaybackData: async () => source },
    { name: "mock", resolve: async ({ link }) => {
      if (link.endsWith("episode-1")) throw new Error("translation unavailable");
      return { sources: [{ quality: "720", url: "https://media.example/second.m3u8", mimeType: "application/x-mpegURL" }] };
    } },
  );
  const candidates = await provider.resolveEpisode(input);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.audio?.translation, "Second Voice");
});
