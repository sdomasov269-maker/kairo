import assert from "node:assert/strict";
import test from "node:test";
import { LookupCircuitBreaker, canRetryLookup, classifyLookup, computeNextRetryAt } from "./lookup-cache.ts";
import { buildMissingTitleWhere, wikidataRuEnabled } from "./selection.ts";

test("only-missing is a Prisma relation filter applied before take", () => {
  assert.deepEqual(buildMissingTitleWhere("ru"), { localizedTitles: { none: { locale: "RU" } } });
  const anime = Array.from({ length: 4206 }, (_, index) => ({ hasRu: index < 2884 }));
  assert.equal(anime.filter((item) => !item.hasRu).length, 1322);
  assert.equal(anime.filter((item) => !item.hasRu).slice(0, 100).length, 100);
});

test("retry selection excludes permanent and too-early entries", () => {
  const now = new Date("2026-08-03T12:00:00Z");
  assert.equal(canRetryLookup({ retryable: true, status: "RATE_LIMITED", attemptCount: 1, nextRetryAt: now }, now, 5), true);
  assert.equal(canRetryLookup({ retryable: false, status: "NOT_FOUND", attemptCount: 1, nextRetryAt: null }, now, 5), false);
  assert.equal(canRetryLookup({ retryable: true, status: "TIMEOUT", attemptCount: 1, nextRetryAt: new Date(now.getTime() + 1) }, now, 5), false);
  assert.equal(canRetryLookup({ retryable: true, status: "SERVER_ERROR", attemptCount: 5, nextRetryAt: null }, now, 5), false);
});

test("429 is retryable and empty result is permanent NOT_FOUND", () => {
  assert.deepEqual(classifyLookup({ status: "temporary-error", results: [], diagnostics: { status: 429, error: "HTTP 429" } }), { status: "RATE_LIMITED", retryable: true, httpStatus: 429, error: "HTTP 429" });
  assert.equal(classifyLookup({ status: "not-found", results: [] }).status, "NOT_FOUND");
  assert.equal(classifyLookup({ status: "temporary-error", results: [], diagnostics: { status: 404, error: "HTTP 404" } }).status, "NOT_FOUND");
  assert.ok(computeNextRetryAt(1, new Date(0)).getTime() >= 60_000);
});

test("successful retry replaces the classified error and circuit stops only future work", () => {
  assert.equal(classifyLookup({ status: "found", results: [] }).status, "FOUND");
  const breaker = new LookupCircuitBreaker(10);
  for (let index = 0; index < 9; index += 1) assert.equal(breaker.record("SERVER_ERROR"), false);
  assert.equal(breaker.record("RATE_LIMITED"), true);
  assert.equal(breaker.open, true);
});

test("Wikidata RU requires explicit opt-in", () => {
  assert.equal(wikidataRuEnabled({ fallbackWikidata: false, skipWikidata: false }), false);
  assert.equal(wikidataRuEnabled({ fallbackWikidata: true, skipWikidata: false }), true);
});
