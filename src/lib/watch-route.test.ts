import assert from "node:assert/strict";
import test from "node:test";
import { unifiedWatchUrl } from "./watch-route.ts";

test("legacy watch links map to shareable unified anime state", () => {
  assert.equal(
    unifiedWatchUrl("anilist-123-example", 4, 7),
    "/anime/anilist-123-example?season=4&episode=7#watch",
  );
});
