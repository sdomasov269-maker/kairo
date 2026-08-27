import "server-only";

import { z } from "zod";
import {
  animegoSearchResultSchema,
  animegoVoicesSchema,
  type AnimegoSearchResult,
  type AnimegoVoices,
} from "../../lib/playback/animego-cvh";
import {
  playbackDescriptorSchema,
  type PlaybackDescriptor,
} from "../../lib/playback/descriptor";
import { PlaybackProviderError } from "./kodik-provider-client";

const baseUrl = () =>
  process.env.ANIME_PROVIDER_URL?.trim() || "http://127.0.0.1:8787";

async function requestProvider(
  path: string,
  timeoutMs = 30_000,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl()), {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timeout =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new PlaybackProviderError(
      timeout ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
      timeout ? "Provider timed out" : "Provider is unavailable",
      timeout ? 504 : 503,
    );
  }
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      value && typeof value === "object" && "detail" in value
        ? value.detail
        : null;
    const code =
      detail &&
      typeof detail === "object" &&
      "code" in detail &&
      typeof detail.code === "string"
        ? detail.code
        : "PROVIDER_ERROR";
    throw new PlaybackProviderError(
      code,
      "AnimeGO/CVH provider rejected the request",
      response.status,
    );
  }
  return value;
}

export async function searchAnimego(
  query: string,
): Promise<AnimegoSearchResult[]> {
  return z
    .array(animegoSearchResultSchema)
    .parse(
      await requestProvider(
        `/v1/animego/search?q=${encodeURIComponent(query)}`,
      ),
    );
}

export async function resolveAnimegoTitle(input: {
  titles: string[];
  year?: number;
  mediaType?: string;
  timeoutMs?: number;
}): Promise<AnimegoSearchResult> {
  const query = new URLSearchParams();
  input.titles.forEach((title) => query.append("title", title));
  if (input.year) query.set("year", String(input.year));
  if (input.mediaType) query.set("media_type", input.mediaType);
  return animegoSearchResultSchema.parse(
    await requestProvider(`/v1/animego/resolve?${query}`, input.timeoutMs),
  );
}

export async function getAnimegoVoices(
  animeId: string,
  episode: number,
  timeoutMs?: number,
): Promise<AnimegoVoices> {
  return animegoVoicesSchema.parse(
    await requestProvider(
      `/v1/animego/titles/${encodeURIComponent(animeId)}/episodes/${episode}/voices`,
      timeoutMs,
    ),
  );
}

export async function resolveAnimegoPlayback(input: {
  animeId: string;
  episode: number;
  translationId?: string;
  timeoutMs?: number;
}): Promise<PlaybackDescriptor> {
  const query = new URLSearchParams();
  if (input.translationId) query.set("translation_id", input.translationId);
  const value = await requestProvider(
    `/v1/animego/titles/${encodeURIComponent(input.animeId)}/episodes/${input.episode}/playback?${query}`,
    input.timeoutMs,
  );
  if (
    !value ||
    typeof value !== "object" ||
    !("sources" in value) ||
    !Array.isArray(value.sources)
  )
    throw new PlaybackProviderError(
      "PROVIDER_ERROR",
      "AnimeGO/CVH returned an invalid descriptor",
    );
  const mapped = {
    ...value,
    sources: value.sources.map((source) => {
      if (
        !source ||
        typeof source !== "object" ||
        !("url" in source) ||
        typeof source.url !== "string"
      )
        return source;
      const match = source.url.match(
        /^\/v1\/relay\/cvh\/([A-Za-z0-9_-]{24,64})\/(manifest\.m3u8|resources\/[A-Za-z0-9_-]{18,48})$/,
      );
      if (!match)
        throw new PlaybackProviderError(
          "PROVIDER_ERROR",
          "AnimeGO/CVH returned an invalid relay path",
        );
      return {
        ...source,
        url: `/api/stream/cvh/${match[1]}/${match[2]}`,
      };
    }),
  };
  return playbackDescriptorSchema.parse(mapped);
}
