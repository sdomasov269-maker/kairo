import assert from "node:assert/strict";
import test from "node:test";
import {
  dropdownShouldClose,
  nextDropdownIndex,
  type DropdownOption,
} from "./kairo-dropdown-state.ts";

const options: DropdownOption[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B", disabled: true },
  { value: "c", label: "C" },
];

test("keyboard navigation wraps and skips disabled options", () => {
  assert.equal(nextDropdownIndex(options, 0, 1), 2);
  assert.equal(nextDropdownIndex(options, 2, 1), 0);
  assert.equal(nextDropdownIndex(options, 0, -1), 2);
});

test("outside targets close the dropdown while contained targets do not", () => {
  const inside = new EventTarget();
  const outside = new EventTarget();
  assert.equal(
    dropdownShouldClose((target) => target === inside, inside),
    false,
  );
  assert.equal(
    dropdownShouldClose((target) => target === inside, outside),
    true,
  );
});
