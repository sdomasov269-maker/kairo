import assert from "node:assert/strict";
import test from "node:test";
import { PlaybackProviderError } from "./kodik-provider-client.ts";
import { createPlaybackManager } from "./provider-manager.ts";

const identity = { shikimoriId: 56735, titles: ["Exact Title"], episode: 4 };
const descriptor = (provider: string) => ({
  provider,
  titleId: "1",
  episode: 4,
  sources: [
    { protocol: "hls" as const, url: "https://media.example/master.m3u8" },
  ],
});

test("primary success never invokes CVH", async () => {
  let cvhCalls = 0;
  const manager = createPlaybackManager({
    kodik: async () => descriptor("kodik"),
    animegoTitle: async () => {
      cvhCalls += 1;
      return { id: "1", title: "x", url: "https://animego.org/x" };
    },
    animegoVoices: async () => {
      throw new Error("unused");
    },
    animegoPlayback: async () => {
      throw new Error("unused");
    },
  });
  const result = await manager.resolve(identity);
  assert.equal(result.provider, "kodik");
  assert.equal(result.fallbackUsed, false);
  assert.equal(cvhCalls, 0);
});

test("eligible failure falls back and matches translation by name", async () => {
  const manager = createPlaybackManager({
    kodik: async () => {
      throw new PlaybackProviderError("PROVIDER_UNAVAILABLE", "down");
    },
    animegoTitle: async () => ({
      id: "3591",
      title: "x",
      url: "https://animego.org/x",
    }),
    animegoVoices: async () => ({
      provider: "animego-cvh" as const,
      titleId: "3591",
      episode: 4,
      voices: [
        {
          player: "cvh" as const,
          translationId: "81",
          name: "Dream Cast",
          cvhId: "1",
          embed: "https://animego.org/e",
          episodeAvailable: true,
          episodeCoverage: 4,
        },
      ],
    }),
    animegoPlayback: async () => descriptor("animego-cvh"),
  });
  const result = await manager.resolve({
    ...identity,
    preferredTranslationName: "dream-cast",
  });
  assert.equal(result.provider, "animego-cvh");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.diagnostics.translationMatch?.confidence, 1);
});

test("contract/request errors do not fall back", async () => {
  let called = false;
  const manager = createPlaybackManager({
    kodik: async () => {
      throw new PlaybackProviderError("INVALID_EPISODE", "bad", 400);
    },
    animegoTitle: async () => {
      called = true;
      throw new Error("unused");
    },
    animegoVoices: async () => {
      throw new Error("unused");
    },
    animegoPlayback: async () => {
      throw new Error("unused");
    },
  });
  await assert.rejects(() => manager.resolve(identity), /bad/);
  assert.equal(called, false);
});

test("double failure becomes one normalized error", async () => {
  const manager = createPlaybackManager({
    kodik: async () => {
      throw new PlaybackProviderError("PROVIDER_UNAVAILABLE", "down");
    },
    animegoTitle: async () => {
      throw new PlaybackProviderError("PROVIDER_UNAVAILABLE", "down");
    },
    animegoVoices: async () => {
      throw new Error("unused");
    },
    animegoPlayback: async () => {
      throw new Error("unused");
    },
  });
  await assert.rejects(
    () => manager.resolve(identity),
    (error: unknown) =>
      error instanceof PlaybackProviderError &&
      error.code === "PLAYBACK_UNAVAILABLE",
  );
});

test("an unplayable preferred default advances deterministically at resolve time", async () => {
  const attempts: string[] = [];
  const manager = createPlaybackManager({
    kodik: async () => {
      throw new PlaybackProviderError("PROVIDER_UNAVAILABLE", "down");
    },
    animegoTitle: async () => ({
      id: "3591",
      title: "x",
      url: "https://animego.org/x",
    }),
    animegoVoices: async () => ({
      provider: "animego-cvh" as const,
      titleId: "3591",
      episode: 4,
      voices: [
        {
          player: "cvh" as const,
          translationId: "12",
          name: "AnimeVost",
          cvhId: "1",
          embed: "https://animego.org/a",
          episodeAvailable: true,
          episodeCoverage: 8,
        },
        {
          player: "cvh" as const,
          translationId: "81",
          name: "Dream Cast",
          cvhId: "1",
          embed: "https://animego.org/d",
          episodeAvailable: true,
          episodeCoverage: 7,
        },
      ],
    }),
    animegoPlayback: async (input) => {
      attempts.push(input.translationId ?? "");
      if (input.translationId === "12")
        throw new PlaybackProviderError("PROVIDER_ERROR", "bad source");
      return descriptor("animego-cvh");
    },
  });
  const result = await manager.resolve({
    ...identity,
    preferredTranslationName: "AniDUB",
  });
  assert.deepEqual(attempts, ["12", "81"]);
  assert.equal(result.diagnostics.translationMatch?.selectedName, "Dream Cast");
  assert.equal(result.diagnostics.translationMatch?.strategy, "default");
});
