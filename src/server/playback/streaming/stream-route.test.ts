import assert from "node:assert/strict";
import test from "node:test";
import { handleMasterStreamRoute, handleResourceStreamRoute, type StreamRouteProxy } from "./stream-route.ts";

const sessionId = "5ba40943-8e49-41ce-a570-e7b6329bca9c";
const token = "a".repeat(48);

test("routes accept only opaque session and resource identifiers", async () => {
  const calls: string[] = [];
  const proxy: StreamRouteProxy = {
    master: async () => { calls.push("master"); return new Response("master"); },
    resource: async () => { calls.push("resource"); return new Response("resource"); },
  };
  const request = new Request("http://localhost/api/stream");
  assert.equal((await handleMasterStreamRoute(request, sessionId, proxy)).status, 200);
  assert.equal((await handleResourceStreamRoute(request, sessionId, token, proxy)).status, 200);
  assert.deepEqual(calls, ["master", "resource"]);
  assert.equal((await handleMasterStreamRoute(request, "https://attacker.example", proxy)).status, 404);
  assert.equal((await handleResourceStreamRoute(request, sessionId, "../../private", proxy)).status, 404);
});
