import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AniLibertyClient, redactAniLibertyUrl } from "./client.ts";
import {
  AniLibertyNotFoundError,
  AniLibertyRateLimitError,
  AniLibertySchemaError,
  AniLibertyTimeoutError,
} from "./errors.ts";
import { openApiSchema } from "./schemas.ts";
const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
test("OpenAPI snapshot is valid and declares the current server", async () => {
  const schema = openApiSchema.parse(
    JSON.parse(
      await readFile(
        "data/media-providers/aniliberty/openapi.snapshot.json",
        "utf8",
      ),
    ),
  );
  assert.equal(schema.openapi, "3.0.0");
  assert.ok(
    schema.servers.some(
      (server) => server.url === "https://aniliberty.top/api/v1",
    ),
  );
});
test("client uses configured OpenAPI server and maps 404", async () => {
  let url = "";
  const client = new AniLibertyClient({
    baseUrl: "https://aniliberty.top/api/v1",
    maxRetries: 0,
    fetcher: (async (input) => {
      url = String(input);
      return response({}, 404);
    }) as typeof fetch,
  });
  await assert.rejects(client.getTitleById(7), AniLibertyNotFoundError);
  assert.equal(
    new URL(url).origin + new URL(url).pathname,
    "https://aniliberty.top/api/v1/anime/releases/7",
  );
});
test("timeout is typed and retries are bounded", async () => {
  let calls = 0;
  const client = new AniLibertyClient({
    maxRetries: 2,
    fetcher: (async () => {
      calls++;
      throw new DOMException("timeout", "AbortError");
    }) as typeof fetch,
  });
  await assert.rejects(client.searchTitles("x"), AniLibertyTimeoutError);
  assert.equal(calls, 3);
});
test("429 honors Retry-After", async () => {
  const waits: number[] = [];
  const client = new AniLibertyClient({
    maxRetries: 1,
    sleep: async (ms) => {
      waits.push(ms);
    },
    fetcher: (async () =>
      response({}, 429, { "retry-after": "2" })) as typeof fetch,
  });
  await assert.rejects(client.searchTitles("x"), AniLibertyRateLimitError);
  assert.deepEqual(waits, [2000]);
});
test("schema drift is typed and diagnostics redact credentials", async () => {
  const logs: unknown[] = [];
  const client = new AniLibertyClient({
    token: "secret-token",
    maxRetries: 0,
    logger: {
      error: (...args) => {
        logs.push(args);
      },
      warn: () => undefined,
    },
    fetcher: (async () => response({ unexpected: true })) as typeof fetch,
  });
  await assert.rejects(
    client.searchTitles("secret-query"),
    AniLibertySchemaError,
  );
  const log = JSON.stringify(logs);
  assert.equal(log.includes("secret-token"), false);
  assert.equal(log.includes("secret-query"), false);
  assert.equal(
    redactAniLibertyUrl("https://example.test/path?token=secret"),
    "https://example.test/path",
  );
});
