import { normalizeAnimeTitle } from "./normalize.ts";
import type { AnimeTitleCandidateInput } from "./types.ts";

export type ExternalAnimeCandidate = {
  id: string;
  native?: string | null;
  romaji?: string | null;
  english?: string | null;
  synonyms?: string[];
  year?: number | null;
  format?: string | null;
  episodes?: number | null;
};

const same = (a?: string | null, b?: string | null) =>
  Boolean(a && b && normalizeAnimeTitle(a) === normalizeAnimeTitle(b));

const formatFamily = (value?: string | null) => {
  const key = value?.toUpperCase();
  if (!key) return null;
  if (["TV", "TV_SHORT", "TV SERIES"].includes(key)) return "TV";
  if (["MOVIE", "MOVIE SERIES", "FILM"].includes(key)) return "MOVIE";
  if (["ONA", "WEB"].includes(key)) return "ONA";
  return key;
};

export function scoreAnimeCandidate(input: AnimeTitleCandidateInput, candidate: ExternalAnimeCandidate): number {
  let score = 0;
  if (same(input.native, candidate.native)) score += 45;
  const primaryMatch = Math.max(
    same(input.romaji, candidate.romaji) || same(input.romaji, candidate.english) ? 35 : 0,
    same(input.english, candidate.english) || same(input.english, candidate.romaji) ? 35 : 0,
  );
  score += primaryMatch;
  const inputSynonyms = input.synonyms.map(normalizeAnimeTitle);
  const candidateTitles = [candidate.native, candidate.romaji, candidate.english, ...(candidate.synonyms ?? [])]
    .filter((title): title is string => Boolean(title))
    .map(normalizeAnimeTitle);
  if (inputSynonyms.some((title) => candidateTitles.includes(title))) score += 25;
  if (input.startYear && candidate.year) score += input.startYear === candidate.year ? 15 : -30;
  const inputFormat = formatFamily(input.format);
  const candidateFormat = formatFamily(candidate.format);
  if (inputFormat && candidateFormat) score += inputFormat === candidateFormat ? 10 : -20;
  if (input.episodes && candidate.episodes) {
    const difference = Math.abs(input.episodes - candidate.episodes);
    score += difference === 0 ? 10 : difference >= Math.max(4, input.episodes * 0.25) ? -15 : 0;
  }
  return Math.max(0, Math.min(100, score));
}

export function rankAnimeCandidates(input: AnimeTitleCandidateInput, candidates: ExternalAnimeCandidate[], minConfidence = 80) {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreAnimeCandidate(input, candidate) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < minConfidence) return { status: "not-found" as const, ranked };
  if (ranked[1] && best.score - ranked[1].score < 8) return { status: "ambiguous" as const, ranked };
  return { status: "found" as const, best, ranked };
}
