import assert from "node:assert/strict"; import test from "node:test";
import { mapKodikContractData, normalizeKodikTranslation, sanitizeKodikMetadata } from "./mapper.ts";
test("missing translation language remains unknown", () => assert.equal(normalizeKodikTranslation({ id: "1", label: "Studio" }).language, "unknown"));
test("studio name does not imply Russian language", () => assert.equal(normalizeKodikTranslation({ id: "1", label: "Russian Studio", studio: "Russian Studio" }).language, "unknown"));
test("explicit language is preserved", () => assert.equal(normalizeKodikTranslation({ id: "1", label: "Dub", language: "uk" }).language, "uk"));
test("media URLs and tokens are removed from metadata", () => { const safe = sanitizeKodikMetadata({ episode: 1, hlsUrl: "secret", token: "secret", title: "Episode" }); assert.deepEqual(safe, { episode: 1, title: "Episode" }); });
test("iframe HTML is never mapped", () => assert.deepEqual(sanitizeKodikMetadata({ iframeHtml: "<iframe />", episode: 1 }), { episode: 1 }));
test("mapping cannot run without official contract", () => assert.throws(() => mapKodikContractData(), /official contract/i));
