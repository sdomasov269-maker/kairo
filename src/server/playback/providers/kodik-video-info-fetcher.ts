const REQUEST_TIMEOUT_MS = 8_000;

const isDebug = () => process.env.KAIRO_PLAYBACK_DEBUG === "true";

function maskUrl(input: string | URL) {
  const url = new URL(input.toString());
  const parts = url.pathname.split("/").filter(Boolean);
  return `${url.origin}/${parts.slice(0, 2).join("/")}${parts.length > 2 ? "/…" : ""}`;
}

function debug(stage: string, data?: Record<string, unknown>) {
  if (isDebug()) console.info("[KairoPlayback]", { stage, ...data });
}

type DiagnosticFetcherOptions = {
  canonicalPlayerUrl?: string;
  videoInfoEndpoint?: string;
  fetchImpl?: typeof fetch;
};

/**
 * kodikwrapper 3.1.0 invokes its discovered video-info endpoint as a GET with
 * query parameters. Kodik player chunks issue the same fields as a form POST.
 */
export function createDiagnosticFetcher({
  canonicalPlayerUrl,
  videoInfoEndpoint,
  fetchImpl = fetch,
}: DiagnosticFetcherOptions = {}) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const inputUrl = new URL(input instanceof Request ? input.url : input.toString());
    const endpointUrl = videoInfoEndpoint && canonicalPlayerUrl
      ? new URL(videoInfoEndpoint, canonicalPlayerUrl)
      : undefined;
    const isVideoInfoRequest = Boolean(
      endpointUrl &&
      inputUrl.origin === endpointUrl.origin &&
      inputUrl.pathname === endpointUrl.pathname,
    );
    const method = isVideoInfoRequest ? "POST" : init?.method ?? "GET";
    const requestUrl = new URL(inputUrl);
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    let body = init?.body;

    if (isVideoInfoRequest) {
      requestUrl.search = "";
      body = inputUrl.search.startsWith("?") ? inputUrl.search.slice(1) : "";
      headers.set("User-Agent", "Mozilla/5.0 (compatible; KairoPlayback/1.0)");
      headers.set("Accept", "application/json, text/plain, */*");
      headers.set("Origin", new URL(canonicalPlayerUrl!).origin);
      headers.set("Referer", canonicalPlayerUrl!);
      headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
      headers.set("X-Requested-With", "XMLHttpRequest");
      debug("video info request", {
        method,
        url: maskUrl(requestUrl),
        origin: headers.get("origin"),
        referer: maskUrl(headers.get("referer")!),
        userAgentPresent: headers.has("user-agent"),
        accept: headers.get("accept"),
        contentType: headers.get("content-type"),
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abort = () => controller.abort();
    init?.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetchImpl(requestUrl, {
        ...init,
        method,
        headers,
        body,
        signal: controller.signal,
      });
      debug("HTTP response", {
        url: maskUrl(requestUrl),
        method,
        status: response.status,
        contentType: response.headers.get("content-type"),
        redirected: response.redirected,
        responseUrl: response.url ? maskUrl(response.url) : undefined,
      });
      const contentType = response.headers.get("content-type");
      if (isVideoInfoRequest && contentType !== "application/json") {
        const responsePreview = (await response.clone().text()).slice(0, 500);
        debug("invalid video info response", {
          url: maskUrl(requestUrl),
          method,
          status: response.status,
          contentType,
          redirected: response.redirected,
          responseUrl: response.url ? maskUrl(response.url) : undefined,
          responsePreview,
        });
      }
      return response;
    } finally {
      clearTimeout(timeout);
      init?.signal?.removeEventListener("abort", abort);
    }
  };
}
