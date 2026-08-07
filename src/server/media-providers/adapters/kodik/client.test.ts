import assert from "node:assert/strict"; import test from "node:test";
import { KodikClient } from "./client.ts"; import { KodikConfigurationError, KodikPartnerAccessRequiredError } from "./errors.ts";
test("client is disabled without config", () => assert.throws(() => new KodikClient().searchTitles(), KodikConfigurationError));
test("base URL alone does not enable client", () => assert.throws(() => new KodikClient({ baseUrl: "https://example.test" }).getTitle(), KodikConfigurationError));
test("token alone does not enable client", () => assert.throws(() => new KodikClient({ token: "secret" }).getEpisodes(), KodikConfigurationError));
test("enabled config still requires partner contract", () => assert.throws(() => new KodikClient({ enabled: true, baseUrl: "https://example.test", token: "secret" }).searchTitles(), KodikPartnerAccessRequiredError));
test("client exposes only token presence", () => { const client = new KodikClient({ token: "secret" }); assert.equal(client.tokenConfigured, true); assert.equal(JSON.stringify(client).includes("secret"), false); });
test("unknown contract never performs guessed requests", () => { const calls = 0; const client = new KodikClient({ enabled: true, baseUrl: "https://example.test", token: "secret" }); assert.throws(() => client.getTitle()); assert.equal(calls, 0); });
test("playback always requires permission", () => assert.throws(() => new KodikClient().getPlayback(), KodikPartnerAccessRequiredError));
