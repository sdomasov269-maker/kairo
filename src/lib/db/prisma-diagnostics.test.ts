import test from "node:test";
import assert from "node:assert/strict";
import { assertPrismaDelegate, classifyPrismaFailure, resetPrismaWarningsForTests, warnOnce } from "./prisma-diagnostics.ts";

test("Prisma delegate assertion reports a stale generated client", () => {
  assert.throws(() => assertPrismaDelegate({ anime: {} }, "animeLocalizedTitle"), /Run prisma generate and restart the server/);
  assert.doesNotThrow(() => assertPrismaDelegate({ animeLocalizedTitle: { findMany() {} } }, "animeLocalizedTitle"));
});
test("Prisma system warnings are emitted once per failure kind", () => {
  resetPrismaWarningsForTests();
  const messages: unknown[][] = [];
  const logger = { warn: (...args: unknown[]) => messages.push(args) };
  assert.equal(warnOnce("missing", "message", undefined, logger), true);
  assert.equal(warnOnce("missing", "message", undefined, logger), false);
  assert.equal(messages.length, 1);
  assert.equal(classifyPrismaFailure({ code: "P2021", message: "missing" }).kind, "TABLE_MISSING");
});
