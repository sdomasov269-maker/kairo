import type { PlaybackCandidate } from "../core/types.ts";
import { validateUpstreamUrl } from "./stream-security.ts";

export const STREAM_MANIFEST_TIMEOUT_MS = 5_000;
export const STREAM_RESOURCE_TIMEOUT_MS = 10_000;
export const STREAM_MAX_REDIRECTS = 3;
export const STREAM_MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

const PROVIDER_REQUEST_HEADERS = new Set([
  "accept",
  "authorization",
  "cookie",
  "origin",
  "referer",
  "user-agent",
]);
const PUBLIC_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
] as const;

export type ValidateStreamUrl = (url: string | URL) => Promise<URL>;

export function safeRangeHeader(value: string | null) {
  return value && /^bytes=(?:\d+-\d*|-\d+)$/.test(value.trim())
    ? value.trim()
    : null;
}

export function buildUpstreamHeaders(
  stream: PlaybackCandidate["stream"],
  browserRange?: string | null,
) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(stream.headers ?? {}))
    if (PROVIDER_REQUEST_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  const range = safeRangeHeader(browserRange ?? null);
  if (range) headers.set("range", range);
  return headers;
}

export function publicResponseHeaders(upstream: Headers) {
  const headers = new Headers();
  for (const name of PUBLIC_RESPONSE_HEADERS) {
    const value = upstream.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

type FetchUpstreamOptions = {
  headers: Headers;
  timeoutMs: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  validateUrl?: ValidateStreamUrl;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function fetchUpstream(
  input: string,
  options: FetchUpstreamOptions,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const validateUrl = options.validateUrl ?? validateUpstreamUrl;
  let current = await validateUrl(input);

  for (let redirects = 0; ; redirects += 1) {
    const timeoutSignal = AbortSignal.timeout(options.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    const response = await fetchImpl(current, {
      method: "GET",
      headers: options.headers,
      redirect: "manual",
      signal,
    });
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    if (redirects >= STREAM_MAX_REDIRECTS) {
      await response.body?.cancel();
      throw new Error("Upstream redirect limit exceeded");
    }
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("Upstream redirect is missing a location");
    current = await validateUrl(new URL(location, current));
  }
}

export async function readManifestText(
  response: Response,
  maximumBytes = STREAM_MAX_MANIFEST_BYTES,
) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes)
    throw new Error("Manifest exceeds size limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error("Manifest exceeds size limit");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}
