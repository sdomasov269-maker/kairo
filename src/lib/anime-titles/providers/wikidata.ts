import { fetchJson, type FetchLike } from "../http.ts";
import { rankAnimeCandidates } from "../matching.ts";
import type {
  AnimeTitleCandidateInput,
  AnimeTitleProvider,
  LocalizedTitleResult,
  ProviderLookup,
} from "../types.ts";

type SearchResponse = {
  search?: Array<{
    id: string;
    label?: string;
    description?: string;
    aliases?: string[];
  }>;
};
type Entity = {
  id: string;
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
  descriptions?: Record<string, { value: string }>;
  sitelinks?: Record<string, { title: string; url?: string }>;
};
type EntityResponse = { entities?: Record<string, Entity> };
const searchCache = new Map<string, SearchResponse>();
const entityCache = new Map<string, EntityResponse>();
const metrics = {
  searchRequests: 0,
  entityRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  requestDurationMs: 0,
};
export function getWikidataMetrics() {
  const requests = metrics.searchRequests + metrics.entityRequests;
  return {
    ...metrics,
    averageRequestDurationMs: requests
      ? Math.round(metrics.requestDurationMs / requests)
      : 0,
  };
}
export function resetWikidataCachesForTests() {
  searchCache.clear();
  entityCache.clear();
  Object.assign(metrics, {
    searchRequests: 0,
    entityRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    requestDurationMs: 0,
  });
}

export class WikidataTitleProvider implements AnimeTitleProvider {
  readonly name = "wikidata";
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;
  constructor(
    fetcher: FetchLike = fetch,
    baseUrl = process.env.WIKIDATA_API_BASE_URL ||
      "https://www.wikidata.org/w/api.php",
  ) {
    this.fetcher = fetcher;
    this.baseUrl = baseUrl;
  }

  async findTitles(anime: AnimeTitleCandidateInput): Promise<ProviderLookup> {
    if (process.env.ANIME_TITLES_WIKIDATA_ENABLED === "false")
      return { status: "not-found", results: [] };
    const query = anime.english || anime.romaji || anime.native;
    if (!query) return { status: "not-found", results: [] };
    try {
      const searchUrl = `${this.baseUrl}?action=wbsearchentities&format=json&origin=*&language=en&uselang=en&type=item&limit=10&search=${encodeURIComponent(query)}`;
      let search = searchCache.get(searchUrl);
      if (search) metrics.cacheHits += 1;
      else {
        metrics.cacheMisses += 1;
        const started = performance.now();
        search = await fetchJson<SearchResponse>(searchUrl, this.fetcher);
        metrics.searchRequests += 1;
        metrics.requestDurationMs += performance.now() - started;
        searchCache.set(searchUrl, search);
      }
      const ids = (search.search ?? []).map((item) => item.id).slice(0, 10);
      if (!ids.length) return { status: "not-found", results: [] };
      const entityUrl = `${this.baseUrl}?action=wbgetentities&format=json&origin=*&ids=${ids.join("|")}&props=labels|aliases|descriptions|sitelinks/urls&languages=en|ja|ru|uk&sitefilter=ruwiki|ukwiki`;
      let payload = entityCache.get(entityUrl);
      if (payload) metrics.cacheHits += 1;
      else {
        metrics.cacheMisses += 1;
        const started = performance.now();
        payload = await fetchJson<EntityResponse>(entityUrl, this.fetcher);
        metrics.entityRequests += 1;
        metrics.requestDurationMs += performance.now() - started;
        entityCache.set(entityUrl, payload);
      }
      const entities = Object.values(payload.entities ?? {});
      const animeEntities = entities.filter((entity) =>
        /(anime|animated|аниме|аніме)/i.test(
          [
            entity.descriptions?.en?.value,
            entity.descriptions?.ru?.value,
            entity.descriptions?.uk?.value,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      );
      const ranked = rankAnimeCandidates(
        anime,
        animeEntities.map((entity) => ({
          id: entity.id,
          english: entity.labels?.en?.value,
          native: entity.labels?.ja?.value,
          synonyms: [
            ...(entity.aliases?.en ?? []),
            ...(entity.aliases?.ja ?? []),
          ].map((item) => item.value),
        })),
      );
      if (ranked.status !== "found")
        return {
          status: ranked.status,
          results: [],
          diagnostics: {
            candidates: ranked.ranked
              .slice(0, 3)
              .map(({ candidate, score }) => ({ id: candidate.id, score })),
          },
        };
      const entity = animeEntities.find(
        (item) => item.id === ranked.best.candidate.id,
      )!;
      const results: LocalizedTitleResult[] = [];
      const add = (locale: "ru" | "uk", label?: string, wikiTitle?: string) => {
        const title = label?.trim() || wikiTitle?.trim();
        if (!title) return;
        results.push({
          title,
          locale,
          source: label ? "WIKIDATA" : "WIKIPEDIA",
          confidence: ranked.best.score,
          externalId: entity.id,
          aliases: (entity.aliases?.[locale] ?? []).map((item) => item.value),
          metadata: {
            wikidataId: entity.id,
            wikipediaUrl: entity.sitelinks?.[`${locale}wiki`]?.url,
            score: ranked.best.score,
          },
        });
      };
      add("uk", entity.labels?.uk?.value, entity.sitelinks?.ukwiki?.title);
      add("ru", entity.labels?.ru?.value, entity.sitelinks?.ruwiki?.title);
      return { status: results.length ? "found" : "not-found", results };
    } catch (error) {
      return {
        status: "temporary-error",
        results: [],
        diagnostics: {
          error:
            error instanceof Error ? error.message : "Unknown provider error",
        },
      };
    }
  }
}
