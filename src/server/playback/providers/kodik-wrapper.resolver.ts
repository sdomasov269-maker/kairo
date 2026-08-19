import "server-only";
import { VideoLinks, type KodikVideoLinks } from "kodikwrapper";
import { KodikWrapperResolverError } from "../errors";
import { canonicalizeKodikPlayerLink } from "./kodik-link";
import type {
  DirectPlaybackResolver,
  DirectPlaybackResult,
  DirectPlaybackSkipSegment,
  DirectPlaybackSource,
} from "../types";

const ENDPOINT_CACHE_TTL_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const endpointCache = new Map<string, { endpoint: string; expiresAt: number }>();

const isDebug = () => process.env.KAIRO_PLAYBACK_DEBUG === "true";

function maskUrl(input: string | URL) {
  const url = new URL(input.toString());
  const parts = url.pathname.split("/").filter(Boolean);
  return `${url.origin}/${parts.slice(0, 2).join("/")}${parts.length > 2 ? "/…" : ""}`;
}

function debug(stage: string, data?: Record<string, unknown>) {
  if (isDebug()) console.info("[KairoPlayback]", { stage, ...data });
}

function errorDetails(error: unknown) {
  const value = error as {
    message?: unknown;
    cause?: unknown;
    code?: unknown;
    data?: { videoInfoResponse?: Response };
  };
  const response = value?.data?.videoInfoResponse;
  return {
    message: error instanceof Error ? error.message : String(error),
    code: typeof value?.code === "string" ? value.code : undefined,
    cause:
      value?.cause instanceof Error
        ? value.cause.message
        : value?.cause
          ? String(value.cause)
          : undefined,
    ...(response
      ? {
          status: response.status,
          contentType: response.headers.get("content-type"),
        }
      : {}),
  };
}

function cacheKey(playerSingleUrl: string) {
  return new URL(playerSingleUrl).origin + new URL(playerSingleUrl).pathname;
}

function createDiagnosticFetcher() {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abort = () => controller.abort();
    init?.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      debug("HTTP response", {
        url: maskUrl(input instanceof Request ? input.url : input),
        status: response.status,
        contentType: response.headers.get("content-type"),
        redirected: response.redirected,
      });
      return response;
    } finally {
      clearTimeout(timeout);
      init?.signal?.removeEventListener("abort", abort);
    }
  };
}

function normalizeSources(links: KodikVideoLinks): DirectPlaybackSource[] {
  const sources: DirectPlaybackSource[] = [];
  for (const [quality, entries] of Object.entries(links))
    for (const entry of entries)
      if (typeof entry.src === "string" && entry.src.length > 0)
        sources.push({
          quality,
          url: entry.src.startsWith("//") ? `https:${entry.src}` : entry.src,
          mimeType: entry.type || "application/x-mpegURL",
        });
  return sources.sort((left, right) => Number(right.quality) - Number(left.quality));
}

function skipSegments(value: Awaited<ReturnType<typeof VideoLinks.parseLink<true>>>["ex"]): DirectPlaybackSkipSegment[] {
  if (!value.skipButtons) return [];
  return VideoLinks.parseSkipButtons(value.skipButtons).flatMap((segment) => {
    const from = Number(segment.from);
    const to = Number(segment.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
    const label = value.skipButtons?.type.toLowerCase() ?? "";
    return [{ type: label.includes("end") ? "ending" : label.includes("open") || label.includes("intro") ? "opening" : "unknown", from, to }];
  });
}

export class KodikWrapperResolver implements DirectPlaybackResolver {
  readonly name = "kodikwrapper";

  async resolve({ link }: { link: string }): Promise<DirectPlaybackResult> {
    try {
      const normalizedLink = VideoLinks.normalizeKodikLink(link);
      const fetcher = createDiagnosticFetcher();
      debug("input Kodik link", { link: maskUrl(normalizedLink) });
      const basic = await VideoLinks.parseLink({ link: normalizedLink, fetcher });
      debug("parseLink", { host: basic.host, type: basic.type, id: basic.id, quality: basic.quality });
      const canonicalPlayerUrl = canonicalizeKodikPlayerLink(normalizedLink);
      debug("canonical player URL", { link: maskUrl(canonicalPlayerUrl), host: "kodikplayer.com" });
      const parsed = await VideoLinks.parseLink({ link: canonicalPlayerUrl, extended: true, fetcher });
      debug("extended parseLink", { host: parsed.host, translation: parsed.ex.translation.title, hasPlayerSingleUrl: Boolean(parsed.ex.playerSingleUrl) });
      const playerSingleUrl = parsed.ex.playerSingleUrl;
      if (!playerSingleUrl) throw new Error("Kodik player chunk URL is missing");
      const absolutePlayerSingleUrl = VideoLinks.normalizeKodikLink(
        playerSingleUrl,
        "kodikplayer.com",
      );
      debug("playerSingleUrl", { url: maskUrl(absolutePlayerSingleUrl) });
      const key = cacheKey(absolutePlayerSingleUrl);
      let cached = endpointCache.get(key);
      const load = async (forceDiscovery = false) => {
        if (forceDiscovery || !cached || cached.expiresAt <= Date.now()) {
          debug("getActualVideoInfoEndpoint", { cache: forceDiscovery ? "refresh" : "miss" });
          const endpoint = await VideoLinks.getActualVideoInfoEndpoint(absolutePlayerSingleUrl, fetcher);
          debug("detected endpoint", { endpoint });
          cached = { endpoint, expiresAt: Date.now() + ENDPOINT_CACHE_TTL_MS };
          endpointCache.set(key, cached);
        } else {
          debug("detected endpoint", { endpoint: cached.endpoint, cache: "hit" });
        }
        debug("getLinks", { endpoint: cached.endpoint });
        return VideoLinks.getLinks({ link: canonicalPlayerUrl, videoInfoEndpoint: cached.endpoint, fetcher });
      };
      let links: KodikVideoLinks;
      try {
        links = await load();
      } catch (error) {
        debug("getLinks failed; rediscovering endpoint", errorDetails(error));
        endpointCache.delete(key);
        links = await load(true);
      }
      debug("returned qualities", { qualities: Object.keys(links).filter((quality) => links[quality]?.length) });
      const sources = normalizeSources(links);
      if (!sources.length) throw new Error("Kodik returned no HLS sources");
      debug("final normalized sources", { qualities: sources.map((source) => source.quality), count: sources.length });
      return {
        sources,
        ...(parsed.ex.translation ? { translation: parsed.ex.translation } : {}),
        ...(skipSegments(parsed.ex).length ? { skipSegments: skipSegments(parsed.ex) } : {}),
      };
    } catch (error) {
      debug("kodikwrapper resolver failed", errorDetails(error));
      throw new KodikWrapperResolverError("kodikwrapper could not resolve direct playback", error);
    }
  }
}

export function clearKodikWrapperEndpointCache() { endpointCache.clear(); }
