import assert from "node:assert/strict";
import test from "node:test";
import { orderDirectHlsSources, selectDirectHlsSource } from "./direct-source.ts";

const sources = [360, 720, 480].map((quality) => ({ quality, url: `https://example.test/${quality}.m3u8`, mimeType: "application/x-mpegURL" }));

test("orders fixed HLS qualities and defaults to the highest source", () => {
  assert.deepEqual(orderDirectHlsSources(sources).map((source) => source.quality), [720, 480, 360]);
  assert.equal(selectDirectHlsSource(sources, null)?.quality, 720);
});

test("selects a requested fixed-quality source", () =>
  assert.equal(selectDirectHlsSource(sources, 480)?.quality, 480));
