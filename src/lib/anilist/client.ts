import type { AniListMedia, AniListResponse } from "./types.ts";
import { AniListRequestError, isRetryableAniListStatus } from "./errors.ts";
import {
  ANIME_BATCH,
  ANIME_BY_ID,
  ANIME_BY_SEARCH,
  CATALOG_PAGE,
  DISCOVERY_PAGE,
} from "./queries.ts";
import { catalogVariables } from "../catalog/utils.ts";
import type { CatalogFilters, CatalogPageInfo } from "../catalog/types.ts";

const ENDPOINT = "https://graphql.anilist.co";
const TIMEOUT_MS = 7000;
const MAX_ERROR_BODY_LENGTH = 2000;
const isDevelopment = process.env.NODE_ENV === "development";

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Kairo/0.1 (server-side AniList client)",
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response): number {
  const retryAfter = response.headers.get("retry-after");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds))
    return Math.min(Math.max(seconds * 1000, 0), 5000);
  return response.status === 429 ? 1000 : 300;
}

function safeResponseBody(body: string): string | undefined {
  const normalized = body.trim();
  return normalized ? normalized.slice(0, MAX_ERROR_BODY_LENGTH) : undefined;
}

function parseResponseBody(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function isNotFoundGraphQLError(message: string): boolean {
  return /(?:not found|no media)/i.test(message);
}

function operationName(query: string): string {
  return query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
}

function safeGraphQLErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return undefined;
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return undefined;
  const messages = errors
    .map((error) =>
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message.slice(0, 300)
        : null,
    )
    .filter((message): message is string => Boolean(message));
  return messages.length ? messages.join("; ") : undefined;
}

function logAniList(event: string, details: Record<string, unknown>) {
  if (isDevelopment) console.info(`[AniList] ${event}`, details);
}

async function request<T>(
  query: string,
  variables: Record<string, unknown>,
  revalidate = 86400,
): Promise<T | null> {
  const operation = operationName(query);
  const anilistId = typeof variables.id === "number" ? variables.id : undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      logAniList("request", {
        operation,
        anilistId,
        endpoint: ENDPOINT,
        attempt: attempt + 1,
        cache: `Next fetch revalidate=${revalidate}s`,
      });
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
        next: { revalidate },
      });
      const responseBody = await response.text();
      const parsedResponseBody = parseResponseBody(responseBody);
      logAniList("response", {
        operation,
        anilistId,
        status: response.status,
        ok: response.ok,
        errorMessage: safeGraphQLErrorMessage(parsedResponseBody),
      });
      if (!response.ok) {
        const retryable = isRetryableAniListStatus(response.status);
        if (attempt === 0 && retryable) {
          await wait(retryDelay(response));
          continue;
        }
        throw new AniListRequestError(
          `AniList request failed with HTTP ${response.status}`,
          response.status,
          retryable,
          safeResponseBody(responseBody),
          parsedResponseBody,
          retryDelay(response),
        );
      }

      if (
        !parsedResponseBody ||
        typeof parsedResponseBody !== "object" ||
        Array.isArray(parsedResponseBody)
      ) {
        throw new AniListRequestError(
          "AniList returned an invalid JSON response",
          response.status,
          true,
          safeResponseBody(responseBody),
          parsedResponseBody,
        );
      }
      const payload = parsedResponseBody as AniListResponse<T>;

      if (payload.errors?.length) {
        if (
          payload.errors.every((error) => isNotFoundGraphQLError(error.message))
        )
          return payload.data ?? null;
        throw new AniListRequestError(
          `AniList GraphQL request failed: ${payload.errors.map((error) => error.message).join("; ")}`,
          response.status,
          false,
          safeResponseBody(responseBody),
          parsedResponseBody,
        );
      }
      if (!payload.data) {
        throw new AniListRequestError(
          "AniList response does not contain data",
          response.status,
          true,
          safeResponseBody(responseBody),
          parsedResponseBody,
        );
      }
      return payload.data;
    } catch (error) {
      logAniList("error", {
        operation,
        anilistId,
        type: error instanceof Error ? error.name : typeof error,
        status: error instanceof AniListRequestError ? error.status : null,
        message:
          error instanceof AniListRequestError
            ? (safeGraphQLErrorMessage(error.parsedResponseBody) ??
              error.message)
            : error instanceof Error
              ? error.message.slice(0, 300)
              : "Unknown error",
      });
      if (error instanceof AniListRequestError) {
        if (attempt === 0 && error.retryable) {
          await wait(300);
          continue;
        }
        throw error;
      }
      if (attempt === 0) {
        await wait(300);
        continue;
      }
      throw new AniListRequestError(
        controller.signal.aborted
          ? "AniList request timed out"
          : "AniList network request failed",
        null,
        true,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new AniListRequestError("AniList request failed", null, true);
}

export async function getAnimeDiscovery({
  sort = "TRENDING_DESC",
  status,
  season,
  seasonYear,
  perPage = 18,
  page = 1,
}: {
  sort?: string;
  status?: string;
  season?: string;
  seasonYear?: number;
  perPage?: number;
  page?: number;
} = {}): Promise<AniListMedia[]> {
  const data = await request<{ Page: { media: AniListMedia[] } }>(
    DISCOVERY_PAGE,
    {
      page: Math.max(1, page),
      perPage: Math.min(Math.max(perPage, 1), 50),
      sort: [sort],
      status,
      season,
      seasonYear,
    },
    10800,
  );
  return Array.isArray(data?.Page?.media) ? data.Page.media : [];
}

export async function getAnimeByAniListId(
  id: number,
): Promise<AniListMedia | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const data = await request<{ Media: AniListMedia | null }>(ANIME_BY_ID, {
    id,
  });
  return data?.Media ?? null;
}

export async function getAnimeBySearch(
  search: string,
): Promise<AniListMedia | null> {
  const normalized = search.trim().slice(0, 100);
  if (!normalized) return null;
  const data = await request<{ Media: AniListMedia | null }>(ANIME_BY_SEARCH, {
    search: normalized,
  });
  return data?.Media ?? null;
}

export async function getAnimeBatch(ids: number[]): Promise<AniListMedia[]> {
  const safeIds = [
    ...new Set(ids.filter((id) => Number.isInteger(id) && id > 0)),
  ].slice(0, 50);
  if (!safeIds.length) return [];
  const data = await request<{ Page: { media: AniListMedia[] } }>(ANIME_BATCH, {
    ids: safeIds,
  });
  return Array.isArray(data?.Page?.media) ? data.Page.media : [];
}

export async function getRelatedAnime(id: number): Promise<AniListMedia[]> {
  const media = await getAnimeByAniListId(id);
  return (
    media?.relations.edges
      .map((edge) => edge.node)
      .filter((related) => related?.type === "ANIME") ?? []
  );
}

export async function searchAnimeCatalog(
  filters: CatalogFilters,
): Promise<{ media: AniListMedia[]; pageInfo: CatalogPageInfo } | null> {
  const data = await request<{
    Page: { media: AniListMedia[]; pageInfo: CatalogPageInfo };
  }>(CATALOG_PAGE, catalogVariables(filters), filters.search ? 3600 : 21600);
  if (!data?.Page || !Array.isArray(data.Page.media) || !data.Page.pageInfo)
    return null;
  return data.Page;
}
