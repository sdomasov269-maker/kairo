import "server-only";

import { isShikimoriAnime, mapShikimoriAnime } from "./mappers";
import type { RussianAnimeMetadata } from "./types";

const BASE_URL = "https://shikimori.one/api/animes";
const TIMEOUT_MS = 7000;
const WEEK = 60 * 60 * 24 * 7;

export async function getRussianAnimeMetadataByMalId(
  malId: number,
): Promise<RussianAnimeMetadata | null> {
  if (!Number.isInteger(malId) || malId <= 0 || malId > 999_999_999)
    return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/${malId}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Kairo/0.1 development",
      },
      signal: controller.signal,
      next: { revalidate: WEEK, tags: [`shikimori-anime-v1-${malId}`] },
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!isShikimoriAnime(payload) || payload.myanimelist_id !== malId)
      return null;
    return mapShikimoriAnime(payload);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Kairo localization] Shikimori unavailable", {
        malId,
        error: error instanceof Error ? error.name : "unknown",
      });
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
