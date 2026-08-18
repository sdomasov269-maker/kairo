import type {
  ProviderAnimeCandidate,
  ProviderAnimeSearchInput,
} from "./types.ts";
const normalized = (value?: string) =>
  (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function scoreProviderCandidate(
  input: ProviderAnimeSearchInput,
  candidate: ProviderAnimeCandidate,
) {
  if (input.anilistId && candidate.anilistId === input.anilistId) return 100;
  if (input.malId && candidate.malId === input.malId) return 100;
  let score =
    normalized(input.title) === normalized(candidate.title)
      ? 75
      : candidate.alternativeTitles?.some(
            (title) => normalized(title) === normalized(input.title),
          )
        ? 68
        : 0;
  if (input.year && candidate.year === input.year) score += 12;
  if (input.format && candidate.format === input.format) score += 8;
  return Math.min(99, score);
}
export function selectProviderCandidate(
  input: ProviderAnimeSearchInput,
  candidates: ProviderAnimeCandidate[],
  minimum = 80,
) {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreProviderCandidate(input, candidate),
    }))
    .sort((a, b) => b.score - a.score);
  if (
    !ranked[0] ||
    ranked[0].score < minimum ||
    (ranked[1] && ranked[0].score - ranked[1].score < 5)
  )
    return null;
  return ranked[0];
}
