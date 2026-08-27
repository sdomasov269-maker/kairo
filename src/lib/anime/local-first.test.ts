import assert from "node:assert/strict";
import test from "node:test";
import type { Anime } from "@/types/media";
import { AniListRequestError } from "../anilist/errors.ts";
import { isTemporarilyDisabledAniListError } from "../anilist/errors.ts";
import {
  enrichLocalAnimeBestEffort,
  findDatabaseAnimeForRoute,
  findLocalAnimeForRoute,
  resolveRelatedAnimeBestEffort,
} from "./local-first.ts";

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

const emptySources = () => ({
  database: async () => null,
  localCatalog: () => null,
  catalogSnapshot: () => null,
  runtime: () => null,
  snapshot: async () => null,
});

test("database result is sufficient and stops later local sources", async () => {
  let laterCalls = 0;
  const result = await findLocalAnimeForRoute("saved", 123, {
    ...emptySources(),
    database: async () => anime,
    localCatalog: () => {
      laterCalls += 1;
      return null;
    },
  });
  assert.equal(result?.anime, anime);
  assert.equal(result?.source, "database");
  assert.equal(laterCalls, 0);
});

test("local catalog survives AniList 403 without snapshot or Jikan", async () => {
  const local = { ...anime, anilistId: 123 };
  const found = await findLocalAnimeForRoute("anilist-123-saved", 123, {
    ...emptySources(),
    localCatalog: () => local,
  });
  const result = await enrichLocalAnimeBestEffort(
    found!.anime,
    async () => {
      throw new AniListRequestError("HTTP 403", 403, false);
    },
    (value) => value as Anime,
    (error) => error instanceof AniListRequestError,
  );
  assert.equal(result, local);
});

test("local sources survive database schema drift", async () => {
  const local = {
    ...anime,
    id: "local-after-db-error",
    slug: "local-after-db-error",
    anilistId: 321,
  };
  const result = await findLocalAnimeForRoute("local-after-db-error", 321, {
    database: async () => {
      throw new Error("P2022 schema drift");
    },
    localCatalog: () => local,
    catalogSnapshot: () => null,
    runtime: () => null,
    snapshot: async () => null,
  });
  assert.equal(result?.source, "local-catalog");
  assert.equal(result?.anime, local);
});

test("detail snapshot is returned before remote resolution", async () => {
  const result = await findLocalAnimeForRoute("anilist-123-saved", 123, {
    ...emptySources(),
    snapshot: async () => anime,
  });
  assert.equal(result?.anime, anime);
  assert.equal(result?.source, "snapshot");
});

test("runtime indexed anime wins over the detail snapshot", async () => {
  let snapshotCalls = 0;
  const result = await findLocalAnimeForRoute("anilist-123-saved", 123, {
    ...emptySources(),
    runtime: () => anime,
    snapshot: async () => {
      snapshotCalls += 1;
      return null;
    },
  });
  assert.equal(result?.source, "runtime-cache");
  assert.equal(snapshotCalls, 0);
});

test("no local record has controlled empty resolution", async () => {
  assert.equal(
    await findLocalAnimeForRoute("anilist-999-missing", 999, emptySources()),
    null,
  );
});

test("available AniList enrichment still merges into a local record", async () => {
  const result = await enrichLocalAnimeBestEffort(
    anime,
    async () => ({ description: "Remote" }),
    (local, remote) => ({ ...local, description: remote.description }),
    () => false,
  );
  assert.equal(result.description, "Remote");
});

test("related anime degrades to an empty list during AniList outage", async () => {
  const result = await resolveRelatedAnimeBestEffort(
    async () => [],
    async () => {
      throw new AniListRequestError("HTTP 403", 403, false);
    },
    (error) => error instanceof AniListRequestError,
  );
  assert.deepEqual(result, []);
});

test("maintenance 403 is recognized as non-retryable provider outage", () => {
  assert.equal(
    isTemporarilyDisabledAniListError(
      403,
      "The AniList API has been temporarily disabled due to severe stability issues.",
    ),
    true,
  );
  assert.equal(isTemporarilyDisabledAniListError(403, "Forbidden"), false);
});
