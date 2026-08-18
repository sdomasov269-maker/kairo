import assert from "node:assert/strict";
import test from "node:test";
import { AniLibertyMediaProvider } from "./adapter.ts";
import { AniLibertyClient } from "./client.ts";
import { AniLibertySchemaError } from "./errors.ts";
import { buildAniLibertySyncPlan, matchAniLibertyRelease } from "./sync.ts";
const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });
test("public metadata requests omit Authorization when no token exists", async () => {
  let auth: string | null = "sent";
  const client = new AniLibertyClient({
    token: "",
    maxRetries: 0,
    fetcher: (async (_input, init) => {
      auth = new Headers(init?.headers).get("authorization");
      return response([]);
    }) as typeof fetch,
  });
  await client.searchTitles("x");
  assert.equal(auth, null);
});
test("explicit credentials use bearer and a Kairo user agent", async () => {
  let headers = new Headers();
  const client = new AniLibertyClient({
    token: "secret",
    maxRetries: 0,
    fetcher: (async (_input, init) => {
      headers = new Headers(init?.headers);
      return response([]);
    }) as typeof fetch,
  });
  await client.searchTitles("x");
  assert.equal(headers.get("authorization"), "Bearer secret");
  assert.match(headers.get("user-agent") ?? "", /^Kairo\//);
});
test("400 is not retried", async () => {
  let calls = 0;
  const client = new AniLibertyClient({
    maxRetries: 3,
    fetcher: (async () => {
      calls++;
      return response({}, 400);
    }) as typeof fetch,
  });
  await assert.rejects(client.searchTitles("x"));
  assert.equal(calls, 1);
});
test("5xx retries are bounded", async () => {
  let calls = 0;
  const client = new AniLibertyClient({
    maxRetries: 2,
    sleep: async () => undefined,
    fetcher: (async () => {
      calls++;
      return response({}, 503);
    }) as typeof fetch,
  });
  await assert.rejects(client.searchTitles("x"));
  assert.equal(calls, 3);
});
test("response size is bounded", async () => {
  const client = new AniLibertyClient({
    maxRetries: 0,
    maxResponseBytes: 1,
    fetcher: (async () => response([])) as typeof fetch,
  });
  await assert.rejects(client.searchTitles("x"), AniLibertySchemaError);
});
test("metadata methods never call video or torrent paths", async () => {
  const paths: string[] = [];
  const client = new AniLibertyClient({
    maxRetries: 0,
    fetcher: (async (input) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      if (path.includes("schedule")) return response({ data: [] });
      if (path.endsWith("/1")) return response({ id: 1, episodes: [] });
      return response([]);
    }) as typeof fetch,
  });
  await client.searchTitles("x");
  await client.getTitleById(1);
  await client.getSchedule();
  assert.equal(
    paths.some((path) => path.includes("videos") || path.includes("torrent")),
    false,
  );
});
test("health failure marks provider degraded", async () => {
  const adapter = new AniLibertyMediaProvider({
    healthCheck: async () => {
      throw new Error("down");
    },
  } as never);
  assert.equal((await adapter.healthCheck()).status, "DEGRADED");
});
test("schedule updates retain cursor", async () => {
  const adapter = new AniLibertyMediaProvider({
    getSchedule: async () => ({ data: [{ id: 7 }] }),
  } as never);
  const result = await adapter.getUpdates?.("cursor");
  assert.equal(result?.cursor, "cursor");
  assert.equal(result?.updates[0].providerAnimeId, "7");
});
test("exact original title can match", async () => {
  const db = { anime: { findMany: async () => [{ id: "a", slug: "anime" }] } };
  assert.equal(
    (
      await matchAniLibertyRelease(db as never, {
        id: 1,
        name: { english: "Steins;Gate" },
      })
    ).method,
    "ORIGINAL_TITLE",
  );
});
test("fuzzy title is sent to manual review", async () => {
  const db = { anime: { findMany: async () => [] } };
  await assert.rejects(
    matchAniLibertyRelease(db as never, { id: 1, name: { main: "Похожее" } }),
    /manual review/,
  );
});
test("dry-run performs no writes and exposes no media URL", async () => {
  let writes = 0;
  const db = {
    anime: {
      findMany: async () => [{ id: "a", slug: "anime" }],
      create: async () => {
        writes++;
      },
    },
    animeMediaProviderConfig: { findUnique: async () => null },
    animeEpisodeProviderReference: { findMany: async () => [] },
  };
  const plan = await buildAniLibertySyncPlan(db as never, {
    id: 1,
    name: { english: "Steins;Gate" },
    episodes: [{ id: "e1", ordinal: 1, hls_720: "https://invalid/video.m3u8" }],
  });
  assert.equal(plan.databaseWrites, 0);
  assert.equal(writes, 0);
  assert.equal(JSON.stringify(plan).includes("m3u8"), false);
});
test("capabilities separate metadata from playback", () => {
  const adapter = new AniLibertyMediaProvider({} as never);
  assert.equal(adapter.capabilities.SEARCH, true);
  assert.equal(adapter.capabilities.EPISODES, true);
  assert.equal(adapter.capabilities.DIRECT_MEDIA, false);
  assert.equal(adapter.capabilities.OFFICIAL_EMBED, false);
});
