import type { AnimeTitleCandidateInput } from "./types.ts";

export function normalizeAnimeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(
      /[^\p{L}\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAnimeTitleVariants(
  input: AnimeTitleCandidateInput,
): string[] {
  const values = [input.native, input.romaji, input.english, ...input.synonyms];
  return [
    ...new Set(
      values
        .map((value) => value && normalizeAnimeTitle(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}
