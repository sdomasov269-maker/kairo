import assert from "node:assert/strict";
import test from "node:test";
import {
  parseKodikMessage,
  resolveKodikPlayerOrigin,
} from "./kodik-player-events.ts";

test("parses supported scalar and nested Kodik messages", () => {
  assert.deepEqual(parseKodikMessage({ key: "kodik_player_time_update", value: 12.5 }), {
    key: "kodik_player_time_update",
    value: 12.5,
  });
  assert.deepEqual(
    parseKodikMessage({
      key: "kodik_player_current_episode",
      value: {
        episode: 3,
        season: null,
        translation: { id: 42, title: "Studio" },
      },
    }),
    {
      key: "kodik_player_current_episode",
      value: {
        episode: 3,
        season: null,
        translation: { id: 42, title: "Studio" },
      },
    },
  );
});

test("rejects unknown and malformed Kodik messages", () => {
  assert.equal(parseKodikMessage(null), null);
  assert.equal(parseKodikMessage({ key: "unknown" }), null);
  assert.equal(
    parseKodikMessage({ key: "kodik_player_seek", value: { time: "12" } }),
    null,
  );
  assert.equal(
    parseKodikMessage({
      key: "kodik_player_current_episode",
      value: { episode: 1, season: 1, translation: { id: "42", title: "Studio" } },
    }),
    null,
  );
});

test("derives only exact HTTPS origins from player src", () => {
  assert.equal(
    resolveKodikPlayerOrigin("https://kodik.info/player/123?episode=1"),
    "https://kodik.info",
  );
  assert.equal(resolveKodikPlayerOrigin("http://kodik.info/player/123"), null);
  assert.equal(resolveKodikPlayerOrigin("not-a-url"), null);
});
