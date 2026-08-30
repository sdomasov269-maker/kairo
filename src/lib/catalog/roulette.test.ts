import assert from "node:assert/strict";
import test from "node:test";
import { createRouletteBag, fisherYates, uniqueVisibleIds } from "./roulette.ts";

function seeded(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("Fisher-Yates preserves every unique entry", () => {
  const input = Array.from({ length: 80 }, (_, index) => `anime-${index}`);
  const shuffled = fisherYates(input, seeded(7));
  assert.deepEqual(new Set(shuffled), new Set(input));
  assert.notDeepEqual(shuffled, input);
});

test("bag does not repeat before exhaustion and regenerates", () => {
  const ids = ["a", "b", "c", "d"];
  const bag = createRouletteBag(ids, seeded(3), 50);
  const firstCycle = ids.map(() => bag.next());
  assert.equal(new Set(firstCycle).size, ids.length);
  assert.ok(ids.includes(bag.next()!));
});

test("current winner is not selected again and small catalogs wrap", () => {
  const bag = createRouletteBag(["a", "b"], seeded(4), 50);
  let current = "a";
  for (let index = 0; index < 20; index += 1) {
    const next = bag.next(current);
    assert.notEqual(next, current);
    current = next!;
  }
});

test("history blocks winners from the previous 50 results", () => {
  const ids = Array.from({ length: 75 }, (_, index) => `anime-${index}`);
  const bag = createRouletteBag(ids, seeded(19), 50);
  const winners: string[] = [];
  for (let index = 0; index < 200; index += 1) {
    const winner = bag.next(winners.at(-1));
    assert.ok(winner);
    assert.equal(winners.slice(-50).includes(winner!), false);
    winners.push(winner!);
  }
});

test("visible window removes duplicate ids", () => {
  assert.deepEqual(uniqueVisibleIds(["a", "b", "b", "c", "d"], 2, 2), ["a", "b", "c", "d"]);
});
