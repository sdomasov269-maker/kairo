const PLAYER_LINK_RE =
  /^https:\/\/([a-z0-9.-]+)\/([a-z]+)\/(\d+)\/([a-z0-9]+)(?:\/(\d+p))?(?:[/?#].*)?$/i;
const PLAYER_SCRIPT_RE =
  /src=["'](\/assets\/js\/app\.player_single\.[a-z0-9]+\.js)["']/i;
const ENDPOINT_RE = /type:\s*["']POST["']\s*,\s*url:\s*atob\(["']([^"']+)["']\)/i;
const TRANSLATION_RE =
  /var\s+translationId\s*=\s*(\d+)\s*;[\s\S]*?var\s+translationTitle\s*=\s*["']([^"']+)["']/i;
const SKIP_RE =
  /parseSkipButtons?\(["']([^"']+)["']\s*,\s*["']([^"']+)["']\)/i;

const SOURCE_CACHE_MS = 5 * 60_000;
const ENDPOINT_CACHE_MS = 6 * 60 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const DEFAULT_ENDPOINT = "/ftor";

type CacheEntry<T> = { value: T; expiresAt: number };

const sourceCache = new Map<string, CacheEntry<KodikDirectPlayback>>();
const endpointCache = new Map<string, CacheEntry<string>>();

export type KodikDirectSource = {
  quality: number;
  url: string;
  mimeType: string;
};

export type KodikDirectChapter = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  type: "intro" | "credits";
};

export type KodikDirectPlayback = {
  sources: KodikDirectSource[];
  chapters: KodikDirectChapter[];
  translation?: { id: number; title: string };
  expiresAt: string;
};

export type KodikDirectResolveOptions = {
  forceRefresh?: boolean;
  fetcher?: typeof fetch;
  now?: () => number;
};

export class KodikDirectStreamError extends Error {
  readonly code:
    | "INVALID_PLAYER_LINK"
    | "PLAYER_UNAVAILABLE"
    | "PLAYER_FORMAT_CHANGED"
    | "VIDEO_INFO_UNAVAILABLE"
    | "VIDEO_INFO_INVALID"
    | "NO_STREAMS";

  constructor(
    code:
      | "INVALID_PLAYER_LINK"
      | "PLAYER_UNAVAILABLE"
      | "PLAYER_FORMAT_CHANGED"
      | "VIDEO_INFO_UNAVAILABLE"
      | "VIDEO_INFO_INVALID"
      | "NO_STREAMS",
    message: string,
  ) {
    super(message);
    this.name = "KodikDirectStreamError";
    this.code = code;
  }
}

function isAllowedPlayerHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) || host.includes("..")) return false;
  if (host === "kodikplayer.com" || host.endsWith(".kodikplayer.com"))
    return true;
  if (host === "kodik.info" || host.endsWith(".kodik.info")) return true;
  if (host === "kodik.cc" || host.endsWith(".kodik.cc")) return true;
  if (host === "aniqit.com" || host.endsWith(".aniqit.com")) return true;
  return false;
}

export function parseKodikPlayerLink(input: string) {
  const normalized = input.startsWith("//") ? `https:${input}` : input;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new KodikDirectStreamError(
      "INVALID_PLAYER_LINK",
      "Kodik player link is not a valid URL",
    );
  }
  if (url.protocol !== "https:" || !isAllowedPlayerHost(url.hostname))
    throw new KodikDirectStreamError(
      "INVALID_PLAYER_LINK",
      "Kodik player host is not allowed",
    );
  const match = url.toString().match(PLAYER_LINK_RE);
  if (!match)
    throw new KodikDirectStreamError(
      "INVALID_PLAYER_LINK",
      "Kodik player link has an unsupported format",
    );
  return {
    url: url.toString(),
    origin: url.origin,
    host: url.hostname,
    type: match[2],
    id: match[3],
    hash: match[4],
  };
}

async function request(
  fetcher: typeof fetch,
  input: string | URL,
  init?: RequestInit,
  cookieJar?: Map<string, string>,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        ...(cookieJar?.size
          ? { cookie: [...cookieJar].map(([key, value]) => `${key}=${value}`).join("; ") }
          : {}),
        ...init?.headers,
      },
    });
    if (cookieJar) {
      const headers = response.headers as Headers & {
        getSetCookie?: () => string[];
      };
      const setCookies =
        headers.getSetCookie?.() ??
        (headers.get("set-cookie")
          ?.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g)
          .map((value) => value.trim()) ??
          []);
      for (const setCookie of setCookies) {
        const pair = setCookie.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator <= 0) continue;
        const key = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1).trim();
        if (value) cookieJar.set(key, value);
        else cookieJar.delete(key);
      }
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

export function decodeKodikSource(value: string) {
  const shifted = value.replace(/[a-zA-Z]/g, (char) => {
    let code = char.charCodeAt(0) + 18;
    const max = char <= "Z" ? 90 : 122;
    if (code > max) code -= 26;
    return String.fromCharCode(code);
  });
  const decoded = decodeBase64(shifted);
  if (!decoded.startsWith("//") && !decoded.startsWith("https://"))
    throw new KodikDirectStreamError(
      "VIDEO_INFO_INVALID",
      "Decoded source is not an HTTPS URL",
    );
  return decoded.startsWith("//") ? `https:${decoded}` : decoded;
}

function parseChapters(page: string): KodikDirectChapter[] {
  const skip = page.match(SKIP_RE);
  if (!skip?.[1]) return [];
  const type = /ending|credits|outro/i.test(skip[2]) ? "credits" : "intro";
  return skip[1]
    .split(",")
    .map((range, index) => {
      const [from, to] = range.split("-").map(Number);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from)
        return null;
      return {
        id: `kodik-${type}-${index}`,
        title: type === "credits" ? "Титры" : "Заставка",
        startTime: from,
        endTime: to,
        type,
      } satisfies KodikDirectChapter;
    })
    .filter((chapter): chapter is KodikDirectChapter => chapter !== null);
}

async function discoverEndpoint(
  playerOrigin: string,
  page: string,
  fetcher: typeof fetch,
  now: number,
  cookieJar: Map<string, string>,
  playerUrl: string,
) {
  const scriptPath = page.match(PLAYER_SCRIPT_RE)?.[1];
  if (!scriptPath) return DEFAULT_ENDPOINT;
  const scriptUrl = new URL(scriptPath, playerOrigin).toString();
  const cached = endpointCache.get(scriptUrl);
  if (cached && cached.expiresAt > now) return cached.value;
  const response = await request(
    fetcher,
    scriptUrl,
    { headers: { referer: playerUrl } },
    cookieJar,
  );
  if (!response.ok)
    throw new KodikDirectStreamError(
      "PLAYER_UNAVAILABLE",
      `Kodik player script returned ${response.status}`,
    );
  if (new URL(response.url || scriptUrl).origin !== playerOrigin)
    throw new KodikDirectStreamError(
      "PLAYER_UNAVAILABLE",
      "Kodik player script redirected to an unexpected host",
    );
  const encoded = (await response.text()).match(ENDPOINT_RE)?.[1];
  const endpoint = encoded ? decodeBase64(encoded) : DEFAULT_ENDPOINT;
  if (!/^\/[a-z0-9/_-]+$/i.test(endpoint))
    throw new KodikDirectStreamError(
      "PLAYER_FORMAT_CHANGED",
      "Kodik video endpoint has an invalid format",
    );
  endpointCache.set(scriptUrl, {
    value: endpoint,
    expiresAt: now + ENDPOINT_CACHE_MS,
  });
  return endpoint;
}

type EncodedSource = { src?: unknown; type?: unknown };

function parseSources(value: unknown): KodikDirectSource[] {
  if (!value || typeof value !== "object")
    throw new KodikDirectStreamError(
      "VIDEO_INFO_INVALID",
      "Kodik response does not contain a links object",
    );
  const sources: KodikDirectSource[] = [];
  for (const [qualityLabel, entries] of Object.entries(value)) {
    const quality = Number.parseInt(qualityLabel, 10);
    if (!Number.isFinite(quality) || !Array.isArray(entries)) continue;
    for (const entry of entries as EncodedSource[]) {
      if (typeof entry?.src !== "string") continue;
      sources.push({
        quality,
        url: decodeKodikSource(entry.src),
        mimeType:
          typeof entry.type === "string"
            ? entry.type
            : "application/x-mpegURL",
      });
    }
  }
  if (!sources.length)
    throw new KodikDirectStreamError(
      "NO_STREAMS",
      "Kodik returned no playable streams",
    );
  return sources.sort((left, right) => left.quality - right.quality);
}

export async function resolveKodikDirectPlayback(
  playerLink: string,
  options: KodikDirectResolveOptions = {},
): Promise<KodikDirectPlayback> {
  const parsed = parseKodikPlayerLink(playerLink);
  const now = (options.now ?? Date.now)();
  if (!options.forceRefresh) {
    const cached = sourceCache.get(parsed.url);
    if (cached && cached.expiresAt > now) return cached.value;
  }
  const fetcher = options.fetcher ?? fetch;
  const cookieJar = new Map<string, string>();
  const pageResponse = await request(fetcher, parsed.url, undefined, cookieJar);
  if (!pageResponse.ok)
    throw new KodikDirectStreamError(
      "PLAYER_UNAVAILABLE",
      `Kodik player returned ${pageResponse.status}`,
    );
  if (new URL(pageResponse.url || parsed.url).origin !== parsed.origin)
    throw new KodikDirectStreamError(
      "PLAYER_UNAVAILABLE",
      "Kodik player redirected to an unexpected host",
    );
  const page = await pageResponse.text();
  const endpoint = await discoverEndpoint(
    parsed.origin,
    page,
    fetcher,
    now,
    cookieJar,
    parsed.url,
  );
  const infoUrl = new URL(endpoint, parsed.origin);
  infoUrl.search = new URLSearchParams({
    type: parsed.type,
    id: parsed.id,
    hash: parsed.hash,
  }).toString();
  const infoResponse = await request(
    fetcher,
    infoUrl,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        origin: parsed.origin,
        referer: parsed.url,
        "x-requested-with": "XMLHttpRequest",
      },
    },
    cookieJar,
  );
  if (!infoResponse.ok)
    throw new KodikDirectStreamError(
      "VIDEO_INFO_UNAVAILABLE",
      `Kodik video endpoint returned ${infoResponse.status}`,
    );
  if (new URL(infoResponse.url || infoUrl).origin !== parsed.origin)
    throw new KodikDirectStreamError(
      "VIDEO_INFO_UNAVAILABLE",
      "Kodik video endpoint redirected to an unexpected host",
    );
  let payload: unknown;
  try {
    payload = await infoResponse.json();
  } catch {
    throw new KodikDirectStreamError(
      "VIDEO_INFO_INVALID",
      "Kodik video endpoint did not return JSON",
    );
  }
  const links =
    payload && typeof payload === "object" && "links" in payload
      ? (payload as { links: unknown }).links
      : null;
  const translationMatch = page.match(TRANSLATION_RE);
  const playback: KodikDirectPlayback = {
    sources: parseSources(links),
    chapters: parseChapters(page),
    ...(translationMatch
      ? {
          translation: {
            id: Number(translationMatch[1]),
            title: translationMatch[2],
          },
        }
      : {}),
    expiresAt: new Date(now + SOURCE_CACHE_MS).toISOString(),
  };
  sourceCache.set(parsed.url, {
    value: playback,
    expiresAt: now + SOURCE_CACHE_MS,
  });
  return playback;
}

export function clearKodikDirectStreamCaches() {
  sourceCache.clear();
  endpointCache.clear();
}
