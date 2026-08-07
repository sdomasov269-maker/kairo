export type AnimeTitleLocale = "ru" | "uk";
export type AnimeTitleSource =
  | "SHIKIMORI"
  | "WIKIDATA"
  | "WIKIPEDIA"
  | "IMPORTED"
  | "AI"
  | "MANUAL";

export type AnimeTitleCandidateInput = {
  anilistId: number;
  malId?: number | null;
  romaji: string | null;
  english: string | null;
  native: string | null;
  synonyms: string[];
  startYear: number | null;
  format: string | null;
  episodes: number | null;
  season: string | null;
};

export type LocalizedTitleResult = {
  title: string;
  locale: AnimeTitleLocale;
  source: Extract<AnimeTitleSource, "SHIKIMORI" | "WIKIDATA" | "WIKIPEDIA">;
  confidence: number;
  externalId?: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
};

export type ProviderLookup = {
  status: "found" | "not-found" | "ambiguous" | "not-eligible" | "temporary-error";
  results: LocalizedTitleResult[];
  diagnostics?: Record<string, unknown>;
};

export interface AnimeTitleProvider {
  name: string;
  findTitles(anime: AnimeTitleCandidateInput): Promise<ProviderLookup>;
}
