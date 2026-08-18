import assert from "node:assert/strict";
import test from "node:test";
import { createCurlStrengthSampler, CURL_MOTION } from "./curlStrength.ts";

test("curl has a fast bounded attack and slower monotonic release", () => {
  const sample = createCurlStrengthSampler();
  assert.equal(sample(0, 1 / 60), 0);
  const active = sample(120, 1 / 60);
  assert.ok(active > 0);
  assert.ok(active <= CURL_MOTION.maxStrength);

  let previous = active;
  for (let frame = 0; frame < 120; frame += 1) {
    const next = sample(120, 1 / 60);
    assert.ok(next <= previous);
    previous = next;
  }
  assert.ok(previous < active * 0.01);
});

test("background-tab sized deltas remain clamped", () => {
  const sample = createCurlStrengthSampler();
  sample(0, 1 / 60);
  const strength = sample(10000, 5);
  assert.ok(strength > 0);
  assert.ok(strength <= CURL_MOTION.maxStrength);
});
