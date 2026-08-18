import { z, type ZodType } from "zod";
import {
  AniLibertyNotFoundError,
  AniLibertyRateLimitError,
  AniLibertySchemaError,
  AniLibertyTimeoutError,
  AniLibertyUnauthorizedError,
  AniLibertyUnavailableError,
} from "./errors.ts";
import {
  releaseSchema,
  scheduleSchema,
  searchResponseSchema,
} from "./schemas.ts";
import {
  formatAniLibertyIssues,
  normalizeAniLibertySearchResponse,
} from "./search.ts";
import type {
  AniLibertyEpisode,
  AniLibertyRelease,
  AniLibertySchedule,
  AniLibertySearchItem,
  AniLibertySearchResult,
} from "./types.ts";

export type AniLibertyClientOptions = {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  logger?: Pick<Console, "error" | "warn">;
};
const DEFAULT_BASE = "https://aniliberty.top/api/v1";
export const redactAniLibertyUrl = (value: string) => {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
};
const retryAfter = (value: string | null) => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

export class AniLibertyClient {
  readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxResponseBytes: number;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: Pick<Console, "error" | "warn">;

  constructor(options: AniLibertyClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.ANILIBERTY_API_BASE_URL ??
      DEFAULT_BASE
    ).replace(/\/$/, "");
    this.token =
      (options.token ?? process.env.ANILIBERTY_API_TOKEN) || undefined;
    this.timeoutMs =
      options.timeoutMs ?? Number(process.env.ANILIBERTY_TIMEOUT_MS ?? 10000);
    this.maxRetries =
      options.maxRetries ?? Number(process.env.ANILIBERTY_MAX_RETRIES ?? 3);
    this.maxResponseBytes = options.maxResponseBytes ?? 2 * 1024 * 1024;
    this.fetcher = options.fetcher ?? fetch;
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.logger = options.logger ?? console;
  }

  private async request<T>(
    path: string,
    schema: ZodType<T>,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params ?? {}))
      url.searchParams.set(key, value);
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          "User-Agent": `Kairo/${process.env.npm_package_version ?? "0.1.0"} provider-integration`,
        };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        const response = await this.fetcher(url, {
          headers,
          signal: controller.signal,
        });
        const size = Number(response.headers.get("content-length") ?? 0);
        if (size > this.maxResponseBytes)
          throw new AniLibertySchemaError(
            "AniLiberty response exceeds size limit",
          );
        if (!response.ok) {
          if (response.status === 404)
            throw new AniLibertyNotFoundError(
              "AniLiberty resource was not found",
              404,
            );
          if ([401, 403].includes(response.status))
            throw new AniLibertyUnauthorizedError(
              "AniLiberty request is not authorized",
              response.status,
            );
          const delay = retryAfter(response.headers.get("retry-after"));
          if (response.status === 429 && attempt < this.maxRetries) {
            await this.sleep(delay ?? 1000 * 2 ** attempt);
            continue;
          }
          if (response.status === 429)
            throw new AniLibertyRateLimitError(
              "AniLiberty rate limit exceeded",
              delay,
            );
          if (response.status >= 500 && attempt < this.maxRetries) {
            await this.sleep(250 * 2 ** attempt);
            continue;
          }
          throw new AniLibertyUnavailableError(
            `AniLiberty request failed with HTTP ${response.status}`,
            response.status,
            response.status >= 500,
          );
        }
        const raw = await response.text();
        if (Buffer.byteLength(raw) > this.maxResponseBytes)
          throw new AniLibertySchemaError(
            "AniLiberty response exceeds size limit",
          );
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          throw new AniLibertySchemaError("AniLiberty returned invalid JSON");
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          this.logger.error("[aniliberty] response schema mismatch", {
            url: redactAniLibertyUrl(url.toString()),
            issues: formatAniLibertyIssues(
              parsed.error,
              json,
              "response",
            ).slice(0, 20),
          });
          throw new AniLibertySchemaError("AniLiberty response schema changed");
        }
        return parsed.data;
      } catch (error) {
        if (
          error instanceof AniLibertyNotFoundError ||
          error instanceof AniLibertyUnauthorizedError ||
          error instanceof AniLibertyRateLimitError ||
          error instanceof AniLibertySchemaError ||
          error instanceof AniLibertyUnavailableError
        )
          throw error;
        if ((error as Error).name === "AbortError") {
          if (attempt < this.maxRetries) continue;
          throw new AniLibertyTimeoutError(
            "AniLiberty request timed out",
            null,
            true,
          );
        }
        if (attempt < this.maxRetries) {
          await this.sleep(250 * 2 ** attempt);
          continue;
        }
        throw new AniLibertyUnavailableError(
          "AniLiberty network request failed",
          null,
          true,
        );
      } finally {
        clearTimeout(timer);
      }
    }
  }

  async searchTitlesWithDiagnostics(
    query: string,
  ): Promise<AniLibertySearchResult> {
    const payload = await this.request(
      "/app/search/releases",
      searchResponseSchema,
      { query },
    );
    return normalizeAniLibertySearchResponse(payload, (message, details) =>
      this.logger.warn(message, details),
    );
  }
  async searchTitles(query: string): Promise<AniLibertySearchItem[]> {
    return (await this.searchTitlesWithDiagnostics(query)).items;
  }
  getTitleById(id: string | number): Promise<AniLibertyRelease> {
    return this.request(
      `/anime/releases/${encodeURIComponent(id)}`,
      releaseSchema,
      {
        include:
          "id,name,year,type,alias,description,episodes_total,is_ongoing,is_in_production,updated_at,episodes",
      },
    );
  }
  async getTitleEpisodes(id: string | number): Promise<AniLibertyEpisode[]> {
    return (await this.getTitleById(id)).episodes ?? [];
  }
  getSchedule(): Promise<AniLibertySchedule> {
    return this.request("/anime/schedule/week", scheduleSchema);
  }
  getEpisodePlayback() {
    return Promise.resolve({
      status: "PARTNER_PERMISSION_REQUIRED" as const,
      sources: [],
    });
  }
  healthCheck() {
    return this.request("/app/status", z.unknown());
  }
}
