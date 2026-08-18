import test from "node:test";
import assert from "node:assert/strict";
import { AniListRequestError } from "./errors.ts";
import { loadAniListIndexPageWithRetry } from "./index-retry.ts";

test("AniList 429 honors Retry-After and retries only the current page", async () => {
  const pages: number[] = [],
    waits: number[] = [];
  const value = await loadAniListIndexPageWithRetry(
    11,
    async (page) => {
      pages.push(page);
      if (pages.length === 1)
        throw new AniListRequestError(
          "429",
          429,
          true,
          undefined,
          undefined,
          7_000,
        );
      return "ok";
    },
    {
      maxRetries: 2,
      backoffBaseMs: 3_000,
      backoffMaxMs: 60_000,
      sleep: async (ms) => {
        waits.push(ms);
      },
    },
  );
  assert.equal(value, "ok");
  assert.deepEqual(pages, [11, 11]);
  assert.deepEqual(waits, [7_000]);
});

test("AniList 429 without Retry-After uses exponential backoff", async () => {
  const waits: number[] = [];
  let attempts = 0;
  await loadAniListIndexPageWithRetry(
    12,
    async () => {
      attempts += 1;
      if (attempts < 3) throw new AniListRequestError("429", 429, true);
      return true;
    },
    {
      maxRetries: 3,
      backoffBaseMs: 3_000,
      backoffMaxMs: 60_000,
      jitter: () => 0,
      sleep: async (ms) => {
        waits.push(ms);
      },
    },
  );
  assert.deepEqual(waits, [3_000, 6_000]);
});

test("AniList non-retryable errors stop immediately", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      loadAniListIndexPageWithRetry(
        13,
        async () => {
          attempts += 1;
          throw new AniListRequestError("403", 403, false);
        },
        { maxRetries: 5, backoffBaseMs: 1, backoffMaxMs: 10 },
      ),
    /403/,
  );
  assert.equal(attempts, 1);
});
