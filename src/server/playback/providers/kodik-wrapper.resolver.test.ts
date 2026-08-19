import assert from "node:assert/strict";
import test from "node:test";
import { retryInvalidHtmlResponse } from "./kodik-video-info-retry.ts";

const invalidHtml = Object.assign(new Error("videoInfoResponse is not json"), {
  code: "get-links-invalid-response",
});

test("retries one invalid HTML video-info response and returns direct data", async () => {
  let attempts = 0;
  const value = await retryInvalidHtmlResponse(
    async () => {
      attempts += 1;
      if (attempts === 1) throw invalidHtml;
      return "direct";
    },
    () => {},
    async () => {},
  );
  assert.equal(value, "direct");
  assert.equal(attempts, 2);
});

test("stops after the second invalid HTML video-info response", async () => {
  let attempts = 0;
  await assert.rejects(
    () => retryInvalidHtmlResponse(async () => { attempts += 1; throw invalidHtml; }, () => {}, async () => {}),
    { code: "get-links-invalid-response" },
  );
  assert.equal(attempts, 2);
});
