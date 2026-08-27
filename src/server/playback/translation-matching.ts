import type { PlaybackTranslation } from "../../lib/playback/descriptor";
import { PlaybackProviderError } from "./kodik-provider-client";

export type TranslationCandidate = PlaybackTranslation & {
  episodeAvailable: boolean;
  episodeCoverage?: number | null;
};

export type TranslationMatch = {
  requestedName: string | null;
  selectedName: string;
  strategy: "exact" | "alias" | "fuzzy" | "default";
  confidence: number;
  changed: boolean;
};

const ALIASES = new Map<string, string>([
  ["anilibria", "anilibria"],
  ["anilibria tv", "anilibria"],
  ["shiza", "shiza project"],
  ["shiza project", "shiza project"],
]);

export function normalizeTranslationName(name: string) {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("ru")
    .replace(/\([^)]*(?:эп(?:изод)?|episode)s?\.?[^)]*\)/giu, " ")
    .replace(/\b(?:tv|тв)\b/giu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasKey(value: string) {
  return ALIASES.get(value) ?? value;
}

function levenshtein(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function translationSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length);
}

export function rankDefaultTranslations(candidates: TranslationCandidate[]) {
  return [...candidates].sort((left, right) => {
    const type = Number(right.type === "voice") - Number(left.type === "voice");
    if (type) return type;
    const availability =
      Number(right.episodeAvailable) - Number(left.episodeAvailable);
    if (availability) return availability;
    const coverage = (right.episodeCoverage ?? 0) - (left.episodeCoverage ?? 0);
    if (coverage) return coverage;
    return (
      normalizeTranslationName(left.name).localeCompare(
        normalizeTranslationName(right.name),
        "en",
      ) || left.id.localeCompare(right.id, "en")
    );
  });
}

export function selectFallbackTranslation(
  candidates: TranslationCandidate[],
  requestedName?: string,
): { translation: TranslationCandidate; match: TranslationMatch } {
  const available = candidates.filter(
    (candidate) => candidate.episodeAvailable,
  );
  if (!available.length)
    throw new PlaybackProviderError(
      "NO_TRANSLATIONS",
      "No CVH voice has this episode",
      404,
    );
  const wanted = normalizeTranslationName(requestedName ?? "");
  let selected = wanted
    ? available.find(
        (candidate) => normalizeTranslationName(candidate.name) === wanted,
      )
    : undefined;
  let strategy: TranslationMatch["strategy"] = "exact";
  let confidence = selected ? 1 : 0;
  if (!selected && wanted) {
    const requestedAlias = aliasKey(wanted);
    selected = available.find(
      (candidate) =>
        aliasKey(normalizeTranslationName(candidate.name)) === requestedAlias,
    );
    if (selected) {
      strategy = "alias";
      confidence = 1;
    }
  }
  if (!selected && wanted) {
    const ranked = available
      .map((candidate) => ({
        candidate,
        confidence: translationSimilarity(
          wanted.replaceAll(" ", ""),
          normalizeTranslationName(candidate.name).replaceAll(" ", ""),
        ),
      }))
      .sort(
        (left, right) =>
          right.confidence - left.confidence ||
          left.candidate.id.localeCompare(right.candidate.id, "en"),
      );
    if (ranked[0] && ranked[0].confidence >= 0.82) {
      selected = ranked[0].candidate;
      strategy = "fuzzy";
      confidence = Number(ranked[0].confidence.toFixed(4));
    }
  }
  if (!selected) {
    selected = rankDefaultTranslations(available)[0];
    strategy = "default";
    confidence = 0;
  }
  return {
    translation: selected,
    match: {
      requestedName: requestedName || null,
      selectedName: selected.name,
      strategy,
      confidence,
      changed: Boolean(requestedName && strategy === "default"),
    },
  };
}
