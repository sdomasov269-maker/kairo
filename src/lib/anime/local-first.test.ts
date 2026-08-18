import assert from "node:assert/strict";
import test from "node:test";
import type { Anime } from "@/types/media";
import { findDatabaseAnimeForRoute } from "./local-first.ts";

const anime = { id: "db", slug: "saved", title: "Saved" } as Anime;
test("detail lookup prefers exact PostgreSQL slug", async () => {
  let idQueries = 0;
  const result = await findDatabaseAnimeForRoute("saved", 123, {
    bySlug: async () => anime,
    byAniListId: async () => {
      idQueries += 1;
      return null;
    },
  });
  assert.equal(result, anime);
  assert.equal(idQueries, 0);
});
test("readable AniList route falls back to PostgreSQL AniList ID", async () => {
  const result = await findDatabaseAnimeForRoute("anilist-123-readable", 123, {
    bySlug: async () => null,
    byAniListId: async (id) => (id === 123 ? anime : null),
  });
  assert.equal(result, anime);
});
