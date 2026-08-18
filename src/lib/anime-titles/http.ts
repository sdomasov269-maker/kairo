export type FetchLike = typeof fetch;

const numberEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const titleRequestConfig = {
  timeoutMs: numberEnv("ANIME_TITLES_REQUEST_TIMEOUT_MS", 15_000),
  delayMs: numberEnv("ANIME_TITLES_REQUEST_DELAY_MS", 1_000),
  maxRetries: numberEnv("ANIME_TITLES_MAX_RETRIES", 4),
};

export class TitleProviderError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  readonly retryAfterMs?: number;
  readonly kind: "http" | "timeout" | "network";
  constructor(
    message: string,
    retryable: boolean,
    status?: number,
    retryAfterMs?: number,
    kind: "http" | "timeout" | "network" = "http",
  ) {
    super(message);
    this.name = "TitleProviderError";
    this.retryable = retryable;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.kind = kind;
  }
}

let requestTail = Promise.resolve();
let lastRequestAt = 0;

async function waitForRateLimit(delayMs: number) {
  const wait = Math.max(0, lastRequestAt + delayMs - Date.now());
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

export async function fetchJson<T>(
  url: string,
  fetcher: FetchLike = fetch,
): Promise<T> {
  let failure: unknown;
  requestTail = requestTail.then(() =>
    waitForRateLimit(titleRequestConfig.delayMs),
  );
  await requestTail;
  for (
    let attempt = 0;
    attempt <= titleRequestConfig.maxRetries;
    attempt += 1
  ) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      titleRequestConfig.timeoutMs,
    );
    try {
      const response = await fetcher(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Kairo anime-title-importer/1.0",
        },
        signal: controller.signal,
      });
      if (response.ok) return (await response.json()) as T;
      const retryable = response.status === 429 || response.status >= 500;
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterDate = retryAfterHeader
        ? Date.parse(retryAfterHeader)
        : Number.NaN;
      const retryAfterSeconds = Number(retryAfterHeader);
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Number.isFinite(retryAfterDate)
          ? Math.max(0, retryAfterDate - Date.now())
          : undefined;
      if (!retryable || attempt === titleRequestConfig.maxRetries) {
        throw new TitleProviderError(
          `Provider returned HTTP ${response.status}`,
          retryable,
          response.status,
          retryAfterMs,
        );
      }
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((resolve) =>
        setTimeout(resolve, retryAfterMs ?? 500 * 2 ** attempt + jitter),
      );
    } catch (error) {
      failure = error;
      const retryable =
        !(error instanceof TitleProviderError) || error.retryable;
      if (!retryable || attempt === titleRequestConfig.maxRetries) break;
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * 2 ** attempt + jitter),
      );
    } finally {
      clearTimeout(timer);
    }
  }
  if (failure instanceof TitleProviderError) throw failure;
  const timeout =
    failure instanceof Error &&
    (failure.name === "AbortError" || /timeout|aborted/i.test(failure.message));
  throw new TitleProviderError(
    failure instanceof Error ? failure.message : "Provider request failed",
    true,
    undefined,
    undefined,
    timeout ? "timeout" : "network",
  );
}
