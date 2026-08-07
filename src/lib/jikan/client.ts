import "server-only";

import type { JikanAnime, JikanResult } from "./types";

const ENDPOINT = "https://api.jikan.moe/v4";
const TIMEOUT_MS = 7000;
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

async function throttle(): Promise<void> {
  const previous = requestQueue;
  let release = () => {};
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  nextRequestAt = Date.now() + 400;
  release();
}

async function request<T>(path: string): Promise<JikanResult<T>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await throttle();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${ENDPOINT}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "Kairo/0.1" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.ok) return { ok: true, data: (await response.json()) as T };
      if (
        attempt === 0 &&
        (response.status === 429 || response.status >= 500)
      ) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Number.isFinite(retryAfter)
              ? Math.min(Math.max(retryAfter * 1000, 0), 5000)
              : 1000,
          ),
        );
        continue;
      }
      return { ok: false, status: response.status };
    } catch {
      if (attempt === 0) continue;
      return { ok: false, status: null };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: null };
}

export async function getJikanDiscovery({
  status,
  season,
  seasonYear,
  perPage = 25,
}: {
  status?: string;
  season?: string;
  seasonYear?: number;
  perPage?: number;
} = {}): Promise<JikanResult<JikanAnime[]>> {
  const limit = Math.min(Math.max(perPage, 1), 25);
  let path: string;
  if (season && seasonYear) {
    path = `/seasons/${seasonYear}/${season.toLowerCase()}?limit=${limit}`;
  } else if (status === "NOT_YET_RELEASED") {
    path = `/seasons/upcoming?limit=${limit}`;
  } else if (status === "FINISHED") {
    path = `/top/anime?filter=bypopularity&limit=${limit}`;
  } else if (status === "RELEASING") {
    path = `/top/anime?filter=airing&limit=${limit}`;
  } else {
    path = `/seasons/now?limit=${limit}`;
  }
  const result = await request<{ data?: JikanAnime[] }>(path);
  return result.ok
    ? {
        ok: true,
        data: Array.isArray(result.data.data) ? result.data.data : [],
      }
    : result;
}

export async function getJikanAnimeById(
  malId: number,
): Promise<JikanResult<JikanAnime | null>> {
  const result = await request<{ data?: JikanAnime }>(`/anime/${malId}/full`);
  return result.ok ? { ok: true, data: result.data.data ?? null } : result;
}

export async function getJikanAnimeBySearch(
  title: string,
): Promise<JikanResult<JikanAnime | null>> {
  const query = encodeURIComponent(title.trim().slice(0, 100));
  if (!query) return { ok: true, data: null };
  const result = await request<{ data?: JikanAnime[] }>(
    `/anime?q=${query}&limit=1&sfw=true`,
  );
  return result.ok ? { ok: true, data: result.data.data?.[0] ?? null } : result;
}
