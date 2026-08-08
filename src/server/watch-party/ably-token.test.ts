import assert from "node:assert/strict";
import test from "node:test";
import { createAblyTokenRequest } from "./ably-token.ts";
test("guest token cannot publish and never contains master secret", () => { const token = createAblyTokenRequest("app.key:super-secret", "guest", "watch-party:1", false, 1_000); assert.deepEqual(JSON.parse(token.capability)["watch-party:1"], ["subscribe", "presence", "history"]); assert.equal(JSON.stringify(token).includes("super-secret"), false); });
test("host token is scoped to its room and may publish", () => { const token = createAblyTokenRequest("app.key:super-secret", "host", "watch-party:7", true, 1_000); assert.equal(JSON.parse(token.capability)["watch-party:7"].includes("publish"), true); assert.equal(Object.keys(JSON.parse(token.capability)).length, 1); });
