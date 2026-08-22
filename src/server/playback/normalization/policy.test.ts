import assert from "node:assert/strict";
import test from "node:test";
import { decideNormalization } from "./policy.ts";
import type { SourceHealthResult } from "./contracts.ts";
const health = (overrides: Partial<SourceHealthResult>): SourceHealthResult => ({ status: "healthy", confidence: 1, reasons: [], metrics: {}, analyzerVersion: "test-v1", analyzedAt: new Date(0), ...overrides });
const decide = (result: SourceHealthResult, overrides: Partial<Parameters<typeof decideNormalization>[0]> = {}) => decideNormalization({ health: result, hasHealthyFallback: false, normalizationCapacityAvailable: true, copyResegmentationSafe: false, ...overrides });
test("normalization policy preserves healthy pass-through", () => assert.deepEqual(decide(health({})), { action: "PASS_THROUGH", level: "NONE", reason: "source-healthy" }));
test("normalization policy selects the minimum proven level", () => {
  assert.equal(decide(health({ status: "normalization-recommended", reasons: ["duration-mismatch"] })).level, "MANIFEST_ONLY");
  assert.equal(decide(health({ status: "normalization-recommended", reasons: ["non-random-access-boundaries"] }), { copyResegmentationSafe: true }).level, "RESEGMENT_COPY");
  assert.equal(decide(health({ status: "normalization-recommended", reasons: ["presentation-cadence-gap"] })).level, "VIDEO_REENCODE");
});
test("normalization policy does not blindly encode uncertain sources", () => assert.equal(decide(health({ status: "suspect", confidence: 0.4, reasons: ["presentation-cadence-gap"] })).action, "PASS_THROUGH"));
test("normalization policy prefers healthy fallback and protects capacity", () => {
  assert.equal(decide(health({ status: "normalization-recommended", reasons: ["presentation-cadence-gap"] }), { hasHealthyFallback: true }).action, "FALLBACK");
  assert.equal(decide(health({ status: "normalization-recommended", reasons: ["presentation-cadence-gap"] }), { normalizationCapacityAvailable: false }).action, "FALLBACK");
});
