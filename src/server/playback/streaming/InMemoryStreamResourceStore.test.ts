import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryStreamResourceStore } from "./InMemoryStreamResourceStore.ts";

test("creates opaque session-scoped tokens and resolves resources", async () => {
  const now = new Date("2026-08-21T12:00:00.000Z");
  const store = new InMemoryStreamResourceStore(() => now, () => "a".repeat(48));
  const token = await store.create({
    sessionId: "session-a",
    url: "https://cdn.example/segment.ts",
    kind: "segment",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60_000),
  });
  assert.equal(token, "a".repeat(48));
  assert.equal(token.includes("cdn.example"), false);
  assert.equal((await store.get("session-a", token))?.kind, "segment");
  assert.equal(await store.get("session-b", token), null);
  assert.equal(await store.get("session-a", "b".repeat(48)), null);
});

test("expires resources and deletes all mappings for a session", async () => {
  let now = new Date("2026-08-21T12:00:00.000Z");
  const tokens = ["a".repeat(48), "b".repeat(48), "c".repeat(48)];
  const store = new InMemoryStreamResourceStore(() => now, () => tokens.shift()!);
  const common = { createdAt: now, expiresAt: new Date(now.getTime() + 1_000), kind: "segment" as const };
  const first = await store.create({ ...common, sessionId: "one", url: "https://cdn.example/1.ts" });
  const second = await store.create({ ...common, sessionId: "one", url: "https://cdn.example/2.ts" });
  const other = await store.create({ ...common, sessionId: "two", url: "https://cdn.example/3.ts" });
  await store.deleteSession("one");
  assert.equal(await store.get("one", first), null);
  assert.equal(await store.get("one", second), null);
  assert.ok(await store.get("two", other));
  now = new Date(now.getTime() + 1_001);
  assert.equal(await store.get("two", other), null);
});
