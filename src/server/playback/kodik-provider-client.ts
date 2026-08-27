import "server-only";

import {
  playbackDescriptorSchema,
  playbackTitleInfoSchema,
  type PlaybackDescriptor,
  type PlaybackTitleInfo,
} from "../../lib/playback/descriptor";

export class PlaybackProviderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

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
        : "RESOLVE_FAILED";
    throw new PlaybackProviderError(
      code,
      "Playback provider rejected the request",
      response.status,
    );
  }
  return value;
}

export async function getKodikTitleInfo(
  shikimoriId: number,
): Promise<PlaybackTitleInfo> {
  return playbackTitleInfoSchema.parse(
    await requestProvider(`/v1/kodik/titles/${shikimoriId}`),
  );
}

export async function resolveKodikPlayback(input: {
  shikimoriId: number;
  episode: number;
  translationId?: string;
  timeoutMs?: number;
}): Promise<PlaybackDescriptor> {
  const query = new URLSearchParams({ episode: String(input.episode) });
  if (input.translationId) query.set("translation_id", input.translationId);
  return playbackDescriptorSchema.parse(
    await requestProvider(
      `/v1/kodik/playback/${input.shikimoriId}?${query}`,
      input.timeoutMs,
    ),
  );
}
