import type { PlaybackSessionManager } from "../session/PlaybackSessionManager.ts";
import type { PlaybackSession } from "../session/types.ts";
import { rewriteHlsManifest } from "./ManifestRewriter.ts";
import type { StreamResource, StreamResourceStore } from "./StreamResourceStore.ts";
import { SEGMENT_CACHE_MAX_BYTES, type CachedSegment, type SegmentCache } from "./SegmentCache.ts";
import {
  buildUpstreamHeaders,
  fetchUpstream,
  publicResponseHeaders,
  readManifestText,
  STREAM_MANIFEST_TIMEOUT_MS,
  STREAM_RESOURCE_TIMEOUT_MS,
  type ValidateStreamUrl,
} from "./stream-http.ts";
import { StreamSecurityError } from "./stream-security.ts";
import { parseByteRange } from "./stream-range.ts";

type StreamProxyOptions = {
  fetchImpl?: typeof fetch;
  validateUrl?: ValidateStreamUrl;
  segmentCache?: SegmentCache;
};

function publicError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function upstreamFailureStatus(status: number) {
  return status === 404 ? 404 : 502;
}

function isHlsContentType(value: string | null) {
  return Boolean(value && /(?:mpegurl|m3u8)/i.test(value));
}

function developmentLog(message: string) {
  if (process.env.NODE_ENV === "development") console.info(`[KairoPlayback] ${message}`);
}

export class StreamProxy {
  private readonly sessionManager: PlaybackSessionManager;
  private readonly resourceStore: StreamResourceStore;
  private readonly fetchImpl?: typeof fetch;
  private readonly validateUrl?: ValidateStreamUrl;
  private readonly segmentCache?: SegmentCache;

  constructor(
    sessionManager: PlaybackSessionManager,
    resourceStore: StreamResourceStore,
    options: StreamProxyOptions = {},
  ) {
    this.sessionManager = sessionManager;
    this.resourceStore = resourceStore;
    this.fetchImpl = options.fetchImpl;
    this.validateUrl = options.validateUrl;
    this.segmentCache = options.segmentCache;
  }

  async master(sessionId: string, request: Request): Promise<Response> {
    const session = await this.sessionManager.get(sessionId);
    if (!session) return publicError("STREAM_SESSION_INVALID", 404);
    if (session.primary.stream.type !== "hls") return publicError("STREAM_UNAVAILABLE", 415);
    return this.proxyManifest(session, session.primary.stream.url, request, "stream.manifest");
  }

  async resource(sessionId: string, token: string, request: Request): Promise<Response> {
    const session = await this.sessionManager.get(sessionId);
    if (!session) return publicError("STREAM_SESSION_INVALID", 404);
    const resource = await this.resourceStore.get(sessionId, token);
    if (!resource) return publicError("STREAM_RESOURCE_INVALID", 404);
    if (resource.kind === "manifest")
      return this.proxyManifest(session, resource.url, request, "stream.resource");
    return this.proxyResource(session, resource, request);
  }

  private async proxyManifest(
    session: PlaybackSession,
    upstreamUrl: string,
    request: Request,
    event: string,
  ): Promise<Response> {
    const startedAt = performance.now();
    developmentLog(`${event}.started provider=${session.primary.provider.id} resourceKind=manifest`);
    try {
      const upstream = await fetchUpstream(upstreamUrl, {
        headers: buildUpstreamHeaders(session.primary.stream),
        timeoutMs: STREAM_MANIFEST_TIMEOUT_MS,
        signal: request.signal,
        ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}),
        ...(this.validateUrl ? { validateUrl: this.validateUrl } : {}),
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        return publicError("STREAM_UNAVAILABLE", upstreamFailureStatus(upstream.status));
      }
      const manifest = await readManifestText(upstream);
      if (!manifest.trimStart().startsWith("#EXTM3U")) return publicError("STREAM_UNAVAILABLE", 502);
      const rewritten = await rewriteHlsManifest({
        manifest,
        upstreamUrl: upstream.url || upstreamUrl,
        sessionId: session.id,
        sessionExpiresAt: session.expiresAt,
        resourceStore: this.resourceStore,
      });
      developmentLog(`${event}.success provider=${session.primary.provider.id} resourceKind=manifest status=200 latencyMs=${Math.round(performance.now() - startedAt)}`);
      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return this.handleFailure(error, event, session.primary.provider.id, startedAt);
    }
  }

  private async proxyResource(
    session: PlaybackSession,
    resource: StreamResource,
    request: Request,
  ): Promise<Response> {
    const startedAt = performance.now();
    developmentLog(`stream.resource.started provider=${session.primary.provider.id} resourceKind=${resource.kind}`);
    const cacheable = resource.kind === "segment" && this.segmentCache;
    const cacheKey = resource.token;
    if (cacheable) {
      try {
        const cached = await cacheable.get(session.id, cacheKey);
        if (cached) {
          developmentLog(`stream.cache.hit session=${session.id.slice(0, 8)} resourceKind=segment bytes=${cached.contentLength}`);
          return this.cachedResponse(cached, request.headers.get("range"));
        }
        developmentLog(`stream.cache.miss session=${session.id.slice(0, 8)} resourceKind=segment`);
      } catch {
        developmentLog(`stream.cache.read_failed session=${session.id.slice(0, 8)} resourceKind=segment`);
      }
    }
    try {
      const requestedRange = request.headers.get("range");
      const upstream = await fetchUpstream(resource.url, {
        headers: buildUpstreamHeaders(session.primary.stream, requestedRange),
        timeoutMs: STREAM_RESOURCE_TIMEOUT_MS,
        signal: request.signal,
        ...(this.fetchImpl ? { fetchImpl: this.fetchImpl } : {}),
        ...(this.validateUrl ? { validateUrl: this.validateUrl } : {}),
      });
      if (!upstream.ok && upstream.status !== 206) {
        await upstream.body?.cancel();
        return publicError("STREAM_UNAVAILABLE", upstreamFailureStatus(upstream.status));
      }
      if (isHlsContentType(upstream.headers.get("content-type"))) {
        const manifest = await readManifestText(upstream);
        if (manifest.trimStart().startsWith("#EXTM3U")) {
          const rewritten = await rewriteHlsManifest({
            manifest,
            upstreamUrl: upstream.url || resource.url,
            sessionId: session.id,
            sessionExpiresAt: session.expiresAt,
            resourceStore: this.resourceStore,
          });
          return new Response(rewritten, {
            status: 200,
            headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
          });
        }
      }
      const headers = publicResponseHeaders(upstream.headers);
      if (cacheable && upstream.status === 200 && !requestedRange && upstream.body) {
        const declared = Number(upstream.headers.get("content-length"));
        const declaredLength = Number.isSafeInteger(declared) && declared >= 0 ? declared : undefined;
        if (declaredLength !== undefined && declaredLength > SEGMENT_CACHE_MAX_BYTES) {
          developmentLog(`stream.cache.bypass session=${session.id.slice(0, 8)} resourceKind=segment reason=oversized`);
        } else {
          const [cacheBody, browserBody] = upstream.body.tee();
          const result = await cacheable.set(session.id, cacheKey, {
            body: cacheBody,
            ...(declaredLength !== undefined ? { declaredLength } : {}),
            ...(upstream.headers.get("content-type") ? { contentType: upstream.headers.get("content-type")! } : {}),
            ...(upstream.headers.get("etag") ? { etag: upstream.headers.get("etag")! } : {}),
            ...(upstream.headers.get("last-modified") ? { lastModified: upstream.headers.get("last-modified")! } : {}),
            createdAt: new Date(),
            expiresAt: session.expiresAt,
          });
          developmentLog(
            result.stored
              ? `stream.cache.store session=${session.id.slice(0, 8)} resourceKind=segment bytes=${result.bytes}`
              : `stream.cache.store_failed session=${session.id.slice(0, 8)} resourceKind=segment reason=${result.reason}`,
          );
          developmentLog(`stream.resource.success provider=${session.primary.provider.id} resourceKind=${resource.kind} status=${upstream.status} latencyMs=${Math.round(performance.now() - startedAt)}`);
          return new Response(browserBody, { status: upstream.status, headers });
        }
      }
      developmentLog(`stream.resource.success provider=${session.primary.provider.id} resourceKind=${resource.kind} status=${upstream.status} latencyMs=${Math.round(performance.now() - startedAt)}`);
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch (error) {
      return this.handleFailure(error, "stream.resource", session.primary.provider.id, startedAt);
    }
  }

  private cachedResponse(cached: CachedSegment, rangeHeader: string | null) {
    const range = parseByteRange(rangeHeader, cached.contentLength);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      ...(cached.contentType ? { "Content-Type": cached.contentType } : {}),
      ...(cached.etag ? { ETag: cached.etag } : {}),
      ...(cached.lastModified ? { "Last-Modified": cached.lastModified } : {}),
    });
    if (range === "unsatisfiable") {
      headers.set("Content-Range", `bytes */${cached.contentLength}`);
      headers.set("Content-Length", "0");
      return new Response(null, { status: 416, headers });
    }
    if (range) {
      const length = range.end - range.start + 1;
      headers.set("Content-Length", String(length));
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${cached.contentLength}`);
      return new Response(cached.stream(range.start, range.end), { status: 206, headers });
    }
    headers.set("Content-Length", String(cached.contentLength));
    return new Response(cached.stream(), { status: 200, headers });
  }

  private handleFailure(error: unknown, event: string, provider: string, startedAt: number) {
    const rejected = error instanceof StreamSecurityError;
    const timeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    developmentLog(`${rejected ? "stream.security.rejected" : `${event}.failed`} provider=${provider} latencyMs=${Math.round(performance.now() - startedAt)}`);
    return publicError("STREAM_UNAVAILABLE", timeout ? 504 : rejected ? 403 : 502);
  }
}
