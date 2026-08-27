import assert from "node:assert/strict";
import test from "node:test";
import { activeSkipSegment, skipTarget } from "./skip-segments.ts";

const opening = { kind: "opening" as const, start: 0, end: 90 };
const ending = { kind: "ending" as const, start: 1100, end: 1200 };

test("skip visibility is limited to the opening and ending windows", () => {
  assert.equal(activeSkipSegment([opening, ending], -1), null);
  assert.equal(activeSkipSegment([opening, ending], 0), opening);
  assert.equal(activeSkipSegment([opening, ending], 45), opening);
  assert.equal(activeSkipSegment([opening, ending], 90), null);
  assert.equal(activeSkipSegment([opening, ending], 1150), ending);
  assert.equal(activeSkipSegment([opening, ending], 1200), null);
});

test("unknown metadata is not presented and seek target is segment end", () => {
  const unknown = { kind: "unknown" as const, start: 10, end: 20 };
  assert.equal(activeSkipSegment([unknown], 15), null);
  assert.equal(skipTarget(opening), 90);
});

test("new descriptor segments cannot retain a stale active segment", () => {
  assert.equal(activeSkipSegment([opening], 30), opening);
  assert.equal(activeSkipSegment([], 30), null);
  assert.equal(activeSkipSegment([ending], 30), null);
});
