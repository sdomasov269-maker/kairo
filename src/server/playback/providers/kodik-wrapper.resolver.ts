import "server-only";
import { VideoLinks, type KodikVideoLinks } from "kodikwrapper";
import { KodikWrapperResolverError } from "../errors";
import { canonicalizeKodikPlayerLink } from "./kodik-link";
import type { DirectPlaybackResolver, DirectPlaybackResult, DirectPlaybackSource } from "../types";

const ENDPOINT_CACHE_TTL_MS = 15 * 60_000;
const endpointCache = new Map<string, { endpoint: string; expiresAt: number }>();

function normalizeSources(links: KodikVideoLinks): DirectPlaybackSource[] {
  const sources: DirectPlaybackSource[] = [];
  for (const [quality, entries] of Object.entries(links)) {
    for (const entry of entries) {
      if (typeof entry.src !== "string" || !entry.src) continue;
      sources.push({
        quality,
        url: entry.src.startsWith("//") ? `https:${entry.src}` : entry.src,
        mimeType: entry.type || "application/x-mpegURL",
      });
    }
  }
  return sources.sort((left, right) => Number(right.quality) - Number(left.quality));
}

function endpointCacheKey(url: string) {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

function createKodikFetcher(canonicalPlayerUrl?: string, videoInfoEndpoint?: string): typeof fetch {
  return async (input, init) => {
    const inputUrl = new URL(input instanceof Request ? input.url : input.toString());
    const endpointUrl = canonicalPlayerUrl && videoInfoEndpoint
      ? new URL(videoInfoEndpoint, canonicalPlayerUrl)
      : null;
    const isVideoInfo = endpointUrl?.origin === inputUrl.origin && endpointUrl.pathname === inputUrl.pathname;
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    let body = init?.body;
    if (isVideoInfo) {
      body = inputUrl.search.slice(1);
      inputUrl.search = "";
      headers.set("accept", "application/json, text/plain, */*");
      headers.set("content-type", "application/x-www-form-urlencoded; charset=UTF-8");
      headers.set("origin", new URL(canonicalPlayerUrl!).origin);
      headers.set("referer", canonicalPlayerUrl!);
      headers.set("x-requested-with", "XMLHttpRequest");
    }
    return fetch(inputUrl, { ...init, method: isVideoInfo ? "POST" : init?.method, headers, body, signal: AbortSignal.timeout(8_000) });
  };
}

export class KodikWrapperResolver implements DirectPlaybackResolver {
  readonly name = "kodikwrapper";

  async resolve({ link }: { link: string }): Promise<DirectPlaybackResult> {
    try {
      const canonicalPlayerUrl = canonicalizeKodikPlayerLink(VideoLinks.normalizeKodikLink(link));
      const parsed = await VideoLinks.parseLink({ link: canonicalPlayerUrl, extended: true, fetcher: createKodikFetcher() });
      if (!parsed.ex.playerSingleUrl) throw new Error("Kodik player chunk URL is missing");
      const playerSingleUrl = VideoLinks.normalizeKodikLink(parsed.ex.playerSingleUrl, "kodikplayer.com");
      const key = endpointCacheKey(playerSingleUrl);
      let cached = endpointCache.get(key);
      if (!cached || cached.expiresAt <= Date.now()) {
        const endpoint = await VideoLinks.getActualVideoInfoEndpoint(playerSingleUrl, createKodikFetcher());
        cached = { endpoint, expiresAt: Date.now() + ENDPOINT_CACHE_TTL_MS };
        endpointCache.set(key, cached);
      }
      const links = await VideoLinks.getLinks({
        link: canonicalPlayerUrl,
        videoInfoEndpoint: cached.endpoint,
        fetcher: createKodikFetcher(canonicalPlayerUrl, cached.endpoint),
      });
      const sources = normalizeSources(links);
      if (!sources.length) throw new Error("Kodik returned no playable sources");
      return { sources };
    } catch (error) {
      throw new KodikWrapperResolverError("kodikwrapper could not resolve direct playback", error);
    }
  }
}

export function clearKodikWrapperEndpointCache() { endpointCache.clear(); }
