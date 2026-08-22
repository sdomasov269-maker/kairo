import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeKodikPlayerLink } from "./kodik-link.ts";

for (const input of [
  "//aniqit.com/seria/1641709/hash/720p?translations=true",
  "http://aniqit.com/seria/1641709/hash/720p?translations=true",
  "https://aniqit.com/seria/1641709/hash/720p?translations=true",
  "https://kodikplayer.com/seria/1641709/hash/720p?translations=true",
]) {
  test(`canonicalizes ${input}`, () => {
    assert.equal(canonicalizeKodikPlayerLink(input), "https://kodikplayer.com/seria/1641709/hash/720p?translations=true");
  });
}
