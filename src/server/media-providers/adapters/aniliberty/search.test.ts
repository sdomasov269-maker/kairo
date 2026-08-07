import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AniLibertySchemaError } from "./errors.ts";
import { formatAniLibertyIssues, normalizeAniLibertySearchResponse } from "./search.ts";
import { AniLibertySearchItemSchema } from "./schemas.ts";

const valid = { id: 1, name: { main: "Чёрный клевер", english: "Black Clover", alternative: null }, type: { value: "TV", description: "ТВ" }, year: 2017 };
test("current sanitized fixture passes transport schema", async () => { const fixture = JSON.parse(await readFile("src/server/media-providers/adapters/aniliberty/fixtures/search-current.json", "utf8")); assert.ok(normalizeAniLibertySearchResponse(fixture).items.length > 0); });
test("nullable metadata does not reject an item", () => assert.equal(normalizeAniLibertySearchResponse([{ ...valid, type: { value: null, description: null }, description: null }]).items.length, 1));
test("number and string IDs normalize to strings", () => assert.deepEqual(normalizeAniLibertySearchResponse([valid, { ...valid, id: "2" }]).items.map((item) => item.id), ["1", "2"]));
test("unknown fields are allowed", () => assert.equal(normalizeAniLibertySearchResponse([{ ...valid, future_field: { enabled: true } }]).items.length, 1));
test("one damaged item is rejected independently", () => { const warnings: unknown[] = []; const result = normalizeAniLibertySearchResponse([valid, { id: 2, name: "unsupported" }], (_message, details) => warnings.push(details)); assert.equal(result.items.length, 1); assert.equal(result.rejected.length, 1); assert.equal(warnings.length, 1); });
test("missing release ID rejects item", () => { const result = normalizeAniLibertySearchResponse([valid, { name: { main: "No ID" } }], () => undefined); assert.equal(result.rejected[0].index, 1); });
test("unknown top-level wrapper raises SchemaError", () => assert.throws(() => normalizeAniLibertySearchResponse({ results: [valid] }), AniLibertySchemaError));
test("all invalid IDs raise SchemaError", () => assert.throws(() => normalizeAniLibertySearchResponse([{ name: { main: "No ID" } }], () => undefined), AniLibertySchemaError));
test("diagnostic formatter renders full JSON path and received type", () => { const payload = { name: { english: null } }; const parsed = AniLibertySearchItemSchema.safeParse(payload); assert.equal(parsed.success, false); if (!parsed.success) { const diagnostics = formatAniLibertyIssues(parsed.error, payload, "results[3]"); assert.ok(diagnostics.some((item) => item.path.startsWith("results[3]."))); assert.ok(diagnostics.some((item) => item.receivedType === "undefined")); } });
test("diagnostic formatter redacts URLs and token-like values", () => { const payload = { id: "", name: { main: "https://media.invalid/file.m3u8?token=secret" } }; const parsed = AniLibertySearchItemSchema.safeParse(payload); assert.equal(parsed.success, false); if (!parsed.success) { const output = JSON.stringify(formatAniLibertyIssues(parsed.error, payload)); assert.equal(output.includes("media.invalid"), false); assert.equal(output.includes("secret"), false); } });
test("normalization exposes no media fields", () => { const result = normalizeAniLibertySearchResponse([{ ...valid, external_player: "https://media.invalid/embed" }]); assert.equal(JSON.stringify(result).includes("external_player"), false); assert.equal(JSON.stringify(result).includes("media.invalid"), false); });
