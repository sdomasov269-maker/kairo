import { fetchJson, type FetchLike } from "../http.ts";
import { providerErrorDiagnostics } from "../lookup-cache.ts";
import { rankAnimeCandidates, type ExternalAnimeCandidate } from "../matching.ts";
import type { AnimeTitleCandidateInput, AnimeTitleProvider, ProviderLookup } from "../types.ts";

type ShikimoriAnime = { id: number; myanimelist_id?: number | null; name: string; russian?: string | null; english?: string[]; japanese?: string[]; synonyms?: string[]; aired_on?: string | null; kind?: string | null; episodes?: number | null };

export class ShikimoriTitleProvider implements AnimeTitleProvider {
  readonly name = "shikimori";
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;
  constructor(fetcher: FetchLike = fetch, baseUrl = process.env.SHIKIMORI_API_BASE_URL || "https://shikimori.one/api") {
    this.fetcher = fetcher;
    this.baseUrl = baseUrl;
  }

  async findTitles(anime: AnimeTitleCandidateInput): Promise<ProviderLookup> {
    if (process.env.ANIME_TITLES_SHIKIMORI_ENABLED === "false") return { status: "not-found", results: [] };
    if (!anime.malId) return { status: "not-eligible", results: [], diagnostics: { reason: "not-eligible-without-mal-id" } };
    try {
      let candidates: ShikimoriAnime[] = [];
      let exactMalMatch = false;
      if (anime.malId) {
        const exact = await fetchJson<ShikimoriAnime>(`${this.baseUrl}/animes/${anime.malId}`, this.fetcher);
        if (exact?.id && exact.myanimelist_id === anime.malId) {
          candidates = [exact];
          exactMalMatch = true;
        }
      }
      if (!candidates.length) {
        const query = anime.romaji || anime.english || anime.native;
        if (!query) return { status: "not-found", results: [] };
        candidates = await fetchJson<ShikimoriAnime[]>(`${this.baseUrl}/animes?search=${encodeURIComponent(query)}&limit=10`, this.fetcher);
      }
      const mapped: ExternalAnimeCandidate[] = candidates.map((item) => ({
        id: String(item.id), romaji: item.name, english: item.english?.[0], native: item.japanese?.[0], synonyms: item.synonyms ?? [],
        year: item.aired_on ? Number(item.aired_on.slice(0, 4)) : null, format: item.kind, episodes: item.episodes,
      }));
      const ranked = rankAnimeCandidates(anime, mapped);
      if (exactMalMatch && candidates[0]?.russian?.trim()) {
        const source = candidates[0];
        return { status: "found", results: [{ title: source.russian!.trim(), locale: "ru", source: "SHIKIMORI", confidence: 100, externalId: String(source.id), aliases: source.synonyms ?? [], metadata: { malId: source.myanimelist_id, match: "mal-id", score: 100 } }] };
      }
      if (ranked.status !== "found") return { status: ranked.status, results: [], diagnostics: { candidates: ranked.ranked.slice(0, 3).map(({ candidate, score }) => ({ id: candidate.id, score })) } };
      const source = candidates.find((item) => String(item.id) === ranked.best.candidate.id)!;
      if (!source.russian?.trim()) return { status: "not-found", results: [], diagnostics: { reason: "empty-russian-title" } };
      return { status: "found", results: [{ title: source.russian.trim(), locale: "ru", source: "SHIKIMORI", confidence: ranked.best.score, externalId: String(source.id), aliases: source.synonyms ?? [], metadata: { malId: source.myanimelist_id, score: ranked.best.score } }] };
    } catch (error) {
      return { status: "temporary-error", results: [], diagnostics: providerErrorDiagnostics(error) };
    }
  }
}
