import assert from "node:assert/strict";
import test from "node:test";
import {
  createKodikProviderIfAuthorized,
  KodikMediaProvider,
} from "./adapter.ts";
import { evaluateKodikPolicy, canEnableKodikPlayback } from "./policy.ts";
import { unknownKodikContract } from "./types.ts";
test("adapter is not registered without verified authorization", () =>
  assert.equal(createKodikProviderIfAuthorized(), null));
test("health is controlled and performs no request", async () =>
  assert.equal(
    (await new KodikMediaProvider({} as never).healthCheck()).status,
    "UNSUPPORTED",
  ));
test("all unverified capabilities remain false", () =>
  assert.ok(
    Object.values(new KodikMediaProvider({} as never).capabilities).every(
      (value) => value === false,
    ),
  ));
test("playback policy is partner access required", () =>
  assert.equal(evaluateKodikPolicy().status, "PARTNER_ACCESS_REQUIRED"));
test("playback environment flag cannot bypass policy", () => {
  process.env.KODIK_PLAYBACK_ENABLED = "true";
  assert.equal(canEnableKodikPlayback(), false);
  delete process.env.KODIK_PLAYBACK_ENABLED;
});
test("contract claims remain UNKNOWN", () =>
  assert.ok(
    Object.values(unknownKodikContract).every((value) => value === "UNKNOWN"),
  ));
test("adapter playback never returns media", async () =>
  await assert.rejects(
    new KodikMediaProvider({} as never).getPlayback({
      providerAnimeId: "1",
      providerEpisodeId: "1",
    }),
    /permission/i,
  ));
