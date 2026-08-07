import { AniListRequestError } from "./errors.ts";

export type AniListIndexRetryOptions = { maxRetries: number; backoffBaseMs: number; backoffMaxMs: number; jitter?: () => number; sleep?: (ms: number) => Promise<void> };

export async function loadAniListIndexPageWithRetry<T>(page: number, load: (page: number) => Promise<T>, options: AniListIndexRetryOptions): Promise<T> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 0; ; attempt += 1) {
    try { return await load(page); } catch (error) {
      if (!(error instanceof AniListRequestError) || !error.retryable || ![429, 500, 502, 503, 504].includes(error.status ?? 0) || attempt >= options.maxRetries) throw error;
      const exponential = Math.min(options.backoffBaseMs * 2 ** attempt, options.backoffMaxMs);
      const jitter = Math.floor(exponential * 0.2 * (options.jitter?.() ?? Math.random()));
      await sleep(error.status === 429 && error.retryAfterMs ? error.retryAfterMs : exponential + jitter);
    }
  }
}
