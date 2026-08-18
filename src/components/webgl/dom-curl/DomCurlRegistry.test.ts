import assert from "node:assert/strict";
import test from "node:test";
import { calculateDomCurlTransform } from "./DomCurlRegistry.ts";

test("DOM curl is neutral when shared strength is zero", () => {
  const result = calculateDomCurlTransform({
    centerY: 0,
    viewportHeight: 1000,
    strength: 0,
    multiplier: 0.25,
  });
  assert.equal(Math.abs(result.x), 0);
  assert.equal(result.y, 0);
  assert.equal(result.scaleX, 1);
});

test("text is gentler than a surface", () => {
  const text = calculateDomCurlTransform({
    centerY: 0,
    viewportHeight: 1000,
    strength: 0.072,
    multiplier: 0.25,
  });
  const surface = calculateDomCurlTransform({
    centerY: 0,
    viewportHeight: 1000,
    strength: 0.072,
    multiplier: 0.55,
  });
  assert.ok(Math.abs(text.x) < Math.abs(surface.x));
  assert.ok(text.scaleX > surface.scaleX);
});
