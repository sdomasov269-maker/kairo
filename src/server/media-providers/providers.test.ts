import assert from "node:assert/strict";
import test from "node:test";
import { noCapabilities, type AnimeMediaProvider } from "./types.ts";
import { AnimeMediaProviderRegistry } from "./registry.ts";
import { selectProviderCandidate } from "./matching.ts";
import { resolveProviderPlayback } from "./playback.ts";

const authorization = {
  documentedApi: true,
  officialEmbed: false,
  licensedDirectMedia: true,
  feed: false,
  partnerAccess: false,
  writtenPermission: false,
};
const provider = (
  key: string,
  playback: AnimeMediaProvider["getPlayback"],
): AnimeMediaProvider => ({
  key,
  name: key,
  capabilities: {
    ...noCapabilities(),
    SEARCH: true,
    EPISODES: true,
    DIRECT_MEDIA: true,
  },
  healthCheck: async () => ({
    status: "HEALTHY",
    checkedAt: new Date().toISOString(),
  }),
  searchAnime: async () => [],
  getAnime: async () => null,
  getEpisodes: async () => [],
  getPlayback: playback,
});

test("registry rejects unauthorized providers and duplicate keys", () => {
  const registry = new AnimeMediaProviderRegistry();
  assert.throws(() =>
    registry.register(
      provider("unsupported", async () => null),
      {
        documentedApi: false,
        officialEmbed: false,
        licensedDirectMedia: false,
        feed: false,
        partnerAccess: false,
        writtenPermission: false,
      },
    ),
  );
  registry.register(
    provider("licensed", async () => null),
    authorization,
  );
  assert.throws(() =>
    registry.register(
      provider("licensed", async () => null),
      authorization,
    ),
  );
});

test("identity matching prioritizes AniList/MAL identifiers", () => {
  const selected = selectProviderCandidate(
    { anilistId: 154587, title: "Different" },
    [{ providerAnimeId: "frieren", anilistId: 154587, title: "Frieren" }],
  );
  assert.equal(selected?.score, 100);
});

test("playback falls back to the next healthy provider", async () => {
  const first = provider("primary", async () => {
    throw new Error("offline");
  });
  const second = provider("backup", async () => ({
    kind: "DIRECT",
    referenceId: "episode-1",
    protocol: "MP4",
    url: "https://storage.googleapis.com/video.mp4",
  }));
  const result = await resolveProviderPlayback([first, second], {
    providerAnimeId: "anime",
    providerEpisodeId: "episode",
  });
  assert.equal(result.provider, "backup");
  assert.equal(result.failures[0]?.provider, "primary");
});
