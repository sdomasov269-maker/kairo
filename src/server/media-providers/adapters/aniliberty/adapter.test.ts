import assert from "node:assert/strict";
import test from "node:test";
import { AniLibertyMediaProvider } from "./adapter.ts";
import {
  ANILIBERTY_PLAYBACK_STATUS,
  inspectAniLibertyPlaybackPolicy,
} from "./policy.ts";
test("adapter maps metadata without calling a video endpoint", async () => {
  const calls: string[] = [];
  const client = {
    healthCheck: async () => ({}),
    searchTitles: async () => [{ id: 1, name: { main: "Title" } }],
    getTitleById: async (id: string) => {
      calls.push(id);
      return {
        id: 1,
        name: { main: "Title" },
        episodes: [{ id: "e1", ordinal: 1 }],
      };
    },
    getTitleEpisodes: async (id: string) => {
      calls.push(id);
      return [{ id: "e1", ordinal: 1 }];
    },
    getSchedule: async () => ({ data: [] }),
  };
  const adapter = new AniLibertyMediaProvider(client as never);
  assert.equal((await adapter.searchAnime({ title: "Title" })).length, 1);
  assert.equal((await adapter.getAnime("1"))?.providerAnimeId, "1");
  assert.equal((await adapter.getEpisodes("1"))[0].providerEpisodeId, "e1");
  assert.deepEqual(calls, ["1", "1"]);
});
test("playback stays disabled without partner permission", async () => {
  const adapter = new AniLibertyMediaProvider({} as never);
  assert.equal(ANILIBERTY_PLAYBACK_STATUS, "PARTNER_PERMISSION_REQUIRED");
  assert.deepEqual(inspectAniLibertyPlaybackPolicy(), {
    status: "PARTNER_PERMISSION_REQUIRED",
    sources: [],
  });
  assert.equal(
    await adapter.getPlayback({
      providerAnimeId: "1",
      providerEpisodeId: "e1",
    }),
    null,
  );
  assert.equal(adapter.capabilities.DIRECT_MEDIA, false);
  assert.equal(adapter.capabilities.OFFICIAL_EMBED, false);
});
