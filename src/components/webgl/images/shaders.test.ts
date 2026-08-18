import assert from "node:assert/strict";
import test from "node:test";
import {
  imageFragmentShader,
  passthroughImageFragmentShader,
} from "./shaders.ts";

test("poster shader converts linear sampled color to renderer output space", () => {
  assert.match(imageFragmentShader, /gl_FragColor = color;/);
  assert.match(imageFragmentShader, /#include <colorspace_fragment>/);
  assert.doesNotMatch(imageFragmentShader, /color\.rgb\s*\*=/);
  assert.doesNotMatch(imageFragmentShader, /pow\s*\(/);
});

test("passthrough keeps rect, cover, mask and output color without curl", () => {
  assert.match(passthroughImageFragmentShader, /curledScreenUv = vScreenUv/);
  assert.match(passthroughImageFragmentShader, /coverUv\(/);
  assert.match(passthroughImageFragmentShader, /roundedRectMask\(/);
  assert.match(passthroughImageFragmentShader, /colorspace_fragment/);
  assert.doesNotMatch(
    passthroughImageFragmentShader,
    /curledScreenUv = applyCurl/,
  );
});
