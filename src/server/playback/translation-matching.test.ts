import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTranslationName,
  selectFallbackTranslation,
} from "./translation-matching.ts";

const voice = (
  id: string,
  name: string,
  episodeAvailable = true,
  episodeCoverage = 1,
) => ({ id, name, type: "voice" as const, episodeAvailable, episodeCoverage });

test("normalizes case, punctuation, TV and episode suffixes", () => {
  assert.equal(normalizeTranslationName("AniLibria.TV (12 эп.)"), "anilibria");
  assert.equal(normalizeTranslationName("ANI-DUB"), "ani dub");
});

test("matches the same name exactly despite case", () => {
  const result = selectFallbackTranslation(
    [voice("1", "Dream Cast")],
    "dream cast",
  );
  assert.equal(result.match.strategy, "exact");
  assert.equal(result.match.confidence, 1);
  assert.equal(result.match.changed, false);
});

test("TV postfix and episode count normalize to exact", () => {
  const result = selectFallbackTranslation(
    [voice("1", "AniLibria")],
    "AniLibria.TV (12 эп.)",
  );
  assert.equal(result.match.strategy, "exact");
});

test("curated aliases match known studio variants", () => {
  const result = selectFallbackTranslation(
    [voice("1", "SHIZA Project")],
    "SHIZA",
  );
  assert.equal(result.match.strategy, "alias");
  assert.equal(result.match.confidence, 1);
});

test("strong fuzzy typo is accepted", () => {
  const result = selectFallbackTranslation(
    [voice("1", "AnimeVost")],
    "Anime Vostt",
  );
  assert.equal(result.match.strategy, "fuzzy");
  assert.ok(result.match.confidence >= 0.82);
});

test("weak fuzzy is rejected and reported as default", () => {
  const result = selectFallbackTranslation(
    [voice("1", "Dream Cast")],
    "AniDUB",
  );
  assert.equal(result.match.strategy, "default");
  assert.equal(result.match.confidence, 0);
  assert.equal(result.match.changed, true);
});

test("matching voice without the requested episode is not selected", () => {
  const result = selectFallbackTranslation(
    [voice("1", "AniDUB", false, 12), voice("2", "Dream Cast", true, 8)],
    "AniDUB",
  );
  assert.equal(result.translation.id, "2");
  assert.equal(result.match.strategy, "default");
});

test("default is deterministic and prefers coverage before name", () => {
  const candidates = [
    voice("3", "Zeta", true, 4),
    voice("2", "Beta", true, 12),
    voice("1", "Alpha", true, 12),
  ];
  const first = selectFallbackTranslation(candidates, "Unknown");
  const reversed = selectFallbackTranslation(
    [...candidates].reverse(),
    "Unknown",
  );
  assert.equal(first.translation.id, "1");
  assert.equal(reversed.translation.id, "1");
});
