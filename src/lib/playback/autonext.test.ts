import assert from "node:assert/strict";
import test from "node:test";
import { getNextEpisode } from "./autonext.ts";

test("autonext returns the next episode only inside confirmed metadata", () => {
  assert.equal(getNextEpisode(1, 12), 2);
  assert.equal(getNextEpisode(11, 12), 12);
});

test("last or incomplete episode metadata disables autonext", () => {
  assert.equal(getNextEpisode(12, 12), null);
  assert.equal(getNextEpisode(1, undefined), null);
  assert.equal(getNextEpisode(1, 0), null);
});
