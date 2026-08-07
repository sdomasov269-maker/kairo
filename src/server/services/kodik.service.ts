import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

const translationSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    title: z.string().min(1),
    type: nullableString,
    voice: nullableString,
    is_active: z.boolean().nullable().optional(),
  })
  .passthrough();

const episodeValueSchema = z.union([
  z.string(),
  z.object({ link: z.string(), title: nullableString }).passthrough(),
]);

const resultSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String).optional(),
    link: nullableString,
    title: nullableString,
    title_orig: nullableString,
    other_title: nullableString,
    year: nullableNumber,
    type: nullableString,
    anime_kind: nullableString,
    shikimori_id: nullableString,
    anilist_id: nullableNumber,
    translation: translationSchema.nullable().optional(),
    episodes_count: nullableNumber,
    last_episode: nullableNumber,
    last_season: nullableNumber,
    material_data: z.record(z.string(), z.unknown()).nullable().optional(),
    screenshots: z.array(z.string()).nullable().optional(),
    seasons: z
      .record(
        z.string(),
        z
          .object({
            episodes: z.record(z.string(), episodeValueSchema).optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

const responseSchema = z
  .object({
    time: z.union([z.string(), z.number()]).nullable().optional(),
    total: nullableNumber,
    prev_page: nullableString,
    next_page: nullableString,
    results: z.array(resultSchema),
  })
  .passthrough();

type KodikResult = z.infer<typeof resultSchema>;

export type KodikTranslationOption = {
  id: string;
  title: string;
  type?: string | null;
};

export type KodikEpisodePlayback = {
  embedUrl: string;
  translation: KodikTranslationOption | null;
};

export type KodikRelease = {
  provider: "kodik";
  kodikId: string | null;
  title: string | null;
  originalTitle: string | null;
  year: number | null;
  mediaType: string | null;
  animeKind: string | null;
  shikimoriId: string | null;
  aniListId: number | null;
  translation: {
    id: string;
    title: string;
    type: string | null;
    voice: string | null;
  } | null;
  episodesCount: number | null;
  lastEpisode: number | null;
  lastSeason: number | null;
  embedUrl: string | null;
};

export type KodikSearchStatus =
  | "OK"
  | "CONFIGURATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "NOT_FOUND"
  | "RESPONSE_TOO_LARGE"
  | "UNEXPECTED_CONTENT_TYPE"
  | "INVALID_JSON"
  | "INVALID_RESPONSE"
  | "SCHEMA_MISMATCH"
  | "AMBIGUOUS_MATCH"
  | "PLAYER_BLOCKED"
  | "UNKNOWN_ERROR";

type KodikServiceOptions = {
  token?: string;
  enabled?: boolean;
  playbackEnabled?: boolean;
  allowedEmbedHosts?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  logger?: Pick<Console, "info" | "warn" | "error">;
};

type KodikSearchResult =
  | {
      ok: true;
      status: number;
      results: KodikResult[];
      durationMs: number;
      attempts: number;
    }
  | {
      ok: false;
      status: number | null;
      error: Exclude<KodikSearchStatus, "OK">;
      durationMs: number;
      attempts: number;
      detail?: string;
    };

export type KodikDiagnosticReport = {
  configured: boolean;
  tokenConfigured: boolean;
  endpoint: string;
  externalId: number;
  seasonNumber: number;
  episodeNumber: number;
  strategy: "shikimori_id";
  httpStatus: number | null;
  requestStatus: KodikSearchStatus;
  durationMs: number;
  attempts: number;
  results: number;
  translations: number;
  exactEpisodeMatches: number;
  acceptedEmbedCandidates: number;
  observedEmbedHosts: string[];
  embedHosts: string[];
  releases: KodikRelease[];
  errorDetail?: string;
};

const DEFAULT_BASE_URL = "https://kodikapi.com";
const MAX_RESPONSE_BYTES = 2_000_000;

function retryAfterMilliseconds(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export function sanitizeKodikUrl(value: string) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const cause = "cause" in error ? error.cause : undefined;
  if (cause && typeof cause === "object" && "code" in cause)
    return String(cause.code);
  return "code" in error ? String(error.code) : undefined;
}

function formatSchemaIssues(error: z.ZodError) {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
    .join("; ");
}

export class KodikService {
  private readonly token: string | null;
  private readonly enabled: boolean;
  private readonly playbackEnabled: boolean;
  private readonly allowedEmbedHosts: Set<string>;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly logger: Pick<Console, "info" | "warn" | "error">;

  constructor(options: KodikServiceOptions = {}) {
    this.token = (options.token ?? process.env.KODIK_API_TOKEN)?.trim() || null;
    this.enabled =
      options.enabled ?? process.env.KODIK_PROVIDER_ENABLED === "true";
    this.playbackEnabled =
      options.playbackEnabled ?? process.env.KODIK_PLAYBACK_ENABLED === "true";
    this.allowedEmbedHosts = new Set(
      (options.allowedEmbedHosts ?? process.env.KODIK_ALLOWED_EMBED_HOSTS ?? "")
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    );
    this.baseUrl = (options.baseUrl ?? process.env.KODIK_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.KODIK_TIMEOUT_MS ?? 10_000);
    this.maxRetries = options.maxRetries ?? Number(process.env.KODIK_MAX_RETRIES ?? 2);
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.logger = options.logger ?? console;
  }

  get configured() {
    return (
      this.enabled &&
      this.playbackEnabled &&
      Boolean(this.token) &&
      this.allowedEmbedHosts.size > 0
    );
  }

  get tokenConfigured() {
    return Boolean(this.token);
  }

  private shouldRetry(status: number | null, error?: KodikSearchStatus) {
    return (
      status === 429 ||
      (status !== null && status >= 500) ||
      error === "NETWORK_ERROR" ||
      error === "TIMEOUT"
    );
  }

  private async requestSearch(
    params: Record<string, string | number | boolean>,
    diagnostic = false,
  ): Promise<KodikSearchResult> {
    const startedAt = Date.now();
    const requestEnabled = diagnostic
      ? this.enabled && Boolean(this.token)
      : this.configured;
    if (!requestEnabled || !this.token)
      return {
        ok: false,
        status: null,
        error: "CONFIGURATION_ERROR",
        durationMs: 0,
        attempts: 0,
      };

    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("token", this.token);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, String(value));
    const safeEndpoint = sanitizeKodikUrl(url.toString());

    if (diagnostic || process.env.NODE_ENV !== "production")
      this.logger.info("[kodik] search started", {
        endpoint: safeEndpoint,
        params,
        timeoutMs: this.timeoutMs,
      });

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, {
          headers: { accept: "application/json", "user-agent": "Kairo/0.1.0" },
          signal: controller.signal,
          cache: "no-store",
        });
        const attempts = attempt + 1;
        if (!response.ok) {
          const error: Exclude<KodikSearchStatus, "OK"> =
            response.status === 401
              ? "AUTHENTICATION_ERROR"
              : response.status === 403
                ? "FORBIDDEN"
                : response.status === 404
                  ? "NOT_FOUND"
                  : response.status === 429
                    ? "RATE_LIMITED"
                    : "HTTP_ERROR";
          if (
            attempt < this.maxRetries &&
            this.shouldRetry(response.status, error)
          ) {
            const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"));
            await this.sleep(retryAfter ?? 250 * 2 ** attempt);
            continue;
          }
          this.logger.warn("[kodik] search failed", {
            endpoint: safeEndpoint,
            status: response.status,
            error,
            attempts,
          });
          return {
            ok: false,
            status: response.status,
            error,
            durationMs: Date.now() - startedAt,
            attempts,
          };
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!/\bapplication\/(?:[\w.+-]*\+)?json\b/i.test(contentType))
          return {
            ok: false,
            status: response.status,
            error: "UNEXPECTED_CONTENT_TYPE",
            durationMs: Date.now() - startedAt,
            attempts,
            detail: contentType.slice(0, 100) || "missing content-type",
          };

        const raw = await response.text();
        if (Buffer.byteLength(raw) > MAX_RESPONSE_BYTES)
          return {
            ok: false,
            status: response.status,
            error: "RESPONSE_TOO_LARGE",
            durationMs: Date.now() - startedAt,
            attempts,
          };

        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return {
            ok: false,
            status: response.status,
            error: "INVALID_JSON",
            durationMs: Date.now() - startedAt,
            attempts,
          };
        }

        const parsed = responseSchema.safeParse(json);
        if (!parsed.success) {
          const detail = formatSchemaIssues(parsed.error);
          this.logger.error("[kodik] response schema mismatch", {
            endpoint: safeEndpoint,
            issues: detail,
          });
          return {
            ok: false,
            status: response.status,
            error: "SCHEMA_MISMATCH",
            durationMs: Date.now() - startedAt,
            attempts,
            detail,
          };
        }

        if (parsed.data.results.length === 0)
          return {
            ok: false,
            status: response.status,
            error: "NOT_FOUND",
            durationMs: Date.now() - startedAt,
            attempts,
          };

        if (diagnostic || process.env.NODE_ENV !== "production")
          this.logger.info("[kodik] search completed", {
            endpoint: safeEndpoint,
            status: response.status,
            durationMs: Date.now() - startedAt,
            results: parsed.data.results.length,
            attempts,
          });
        return {
          ok: true,
          status: response.status,
          results: parsed.data.results,
          durationMs: Date.now() - startedAt,
          attempts,
        };
      } catch (error) {
        const isTimeout =
          controller.signal.aborted ||
          (error instanceof Error &&
            (error.name === "AbortError" || error.name === "TimeoutError"));
        const status = isTimeout ? "TIMEOUT" : "NETWORK_ERROR";
        if (attempt < this.maxRetries && this.shouldRetry(null, status)) {
          await this.sleep(250 * 2 ** attempt);
          continue;
        }
        const detail = isTimeout ? undefined : safeErrorCode(error);
        this.logger.warn("[kodik] search failed", {
          endpoint: safeEndpoint,
          error: status,
          code: detail,
          attempts: attempt + 1,
        });
        return {
          ok: false,
          status: null,
          error: status,
          durationMs: Date.now() - startedAt,
          attempts: attempt + 1,
          detail,
        };
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      ok: false,
      status: null,
      error: "NETWORK_ERROR",
      durationMs: Date.now() - startedAt,
      attempts: this.maxRetries + 1,
    };
  }

  private async search(
    params: Record<string, string | number | boolean>,
  ): Promise<KodikResult[]> {
    const response = await this.requestSearch(params);
    return response.ok ? response.results : [];
  }

  private validateEmbedUrl(value: string): string | null {
    try {
      const normalized = value.startsWith("//") ? `https:${value}` : value;
      const url = new URL(normalized);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      const host = url.hostname.toLowerCase();
      const allowed = [...this.allowedEmbedHosts].some(
        (candidate) => host === candidate || host.endsWith(`.${candidate}`),
      );
      return allowed ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private episodeLink(
    result: KodikResult,
    seasonNumber: number,
    episodeNumber: number,
  ) {
    const episode =
      result.seasons?.[String(seasonNumber)]?.episodes?.[String(episodeNumber)];
    const nested = typeof episode === "string" ? episode : episode?.link;
    return nested ?? result.link ?? null;
  }

  private normalizeRelease(result: KodikResult): KodikRelease {
    return {
      provider: "kodik",
      kodikId: result.id ?? null,
      title: result.title ?? null,
      originalTitle: result.title_orig ?? null,
      year: result.year ?? null,
      mediaType: result.type ?? null,
      animeKind: result.anime_kind ?? null,
      shikimoriId: result.shikimori_id ?? null,
      aniListId: result.anilist_id ?? null,
      translation: result.translation
        ? {
            id: result.translation.id,
            title: result.translation.title,
            type: result.translation.type ?? null,
            voice: result.translation.voice ?? null,
          }
        : null,
      episodesCount: result.episodes_count ?? null,
      lastEpisode: result.last_episode ?? null,
      lastSeason: result.last_season ?? null,
      embedUrl: result.link ? this.validateEmbedUrl(result.link) : null,
    };
  }

  async getTranslations(malId: number): Promise<KodikTranslationOption[]> {
    const results = await this.search({
      shikimori_id: malId,
      with_seasons: true,
      limit: 100,
    });
    return [
      ...new Map(
        results.flatMap((result) =>
          result.translation
            ? [[result.translation.id, result.translation] as const]
            : [],
        ),
      ).values(),
    ];
  }

  async getAvailableEpisodeKeys(malId: number): Promise<Set<string>> {
    const results = await this.search({
      shikimori_id: malId,
      with_episodes: true,
      limit: 100,
    });
    const keys = new Set<string>();
    for (const result of results) {
      if (result.link && !result.seasons) keys.add("1:1");
      for (const [season, value] of Object.entries(result.seasons ?? {})) {
        for (const episode of Object.keys(value.episodes ?? {}))
          keys.add(`${season}:${episode}`);
      }
    }
    return keys;
  }

  async getEpisodePlayback(input: {
    malId: number;
    seasonNumber: number;
    episodeNumber: number;
  }): Promise<KodikEpisodePlayback | null> {
    const results = await this.search({
      shikimori_id: input.malId,
      season: input.seasonNumber,
      episode: input.episodeNumber,
      with_episodes: true,
      limit: 100,
    });
    for (const result of results) {
      const link = this.episodeLink(result, input.seasonNumber, input.episodeNumber);
      const embedUrl = link ? this.validateEmbedUrl(link) : null;
      if (embedUrl)
        return { embedUrl, translation: result.translation ?? null };
    }
    return null;
  }

  async diagnoseEpisode(input: {
    malId?: number;
    shikimoriId?: number;
    seasonNumber: number;
    episodeNumber: number;
  }): Promise<KodikDiagnosticReport> {
    const externalId = input.shikimoriId ?? input.malId;
    if (!Number.isSafeInteger(externalId) || !externalId || externalId < 1)
      throw new Error("A positive malId or shikimoriId is required");
    const response = await this.requestSearch(
      {
        shikimori_id: externalId,
        season: input.seasonNumber,
        episode: input.episodeNumber,
        with_episodes: true,
        limit: 100,
      },
      true,
    );
    const base = {
      configured: this.configured,
      tokenConfigured: this.tokenConfigured,
      endpoint: `${this.baseUrl}/search`,
      externalId,
      seasonNumber: input.seasonNumber,
      episodeNumber: input.episodeNumber,
      strategy: "shikimori_id" as const,
      httpStatus: response.status,
      durationMs: response.durationMs,
      attempts: response.attempts,
    };
    if (!response.ok)
      return {
        ...base,
        requestStatus: response.error,
        results: 0,
        translations: 0,
        exactEpisodeMatches: 0,
        acceptedEmbedCandidates: 0,
        observedEmbedHosts: [],
        embedHosts: [],
        releases: [],
        errorDetail: response.detail,
      };

    const exact = response.results.flatMap((result) => {
      const link = this.episodeLink(result, input.seasonNumber, input.episodeNumber);
      return link ? [{ result, link }] : [];
    });
    const accepted = exact.flatMap(({ link }) => {
      const embedUrl = this.validateEmbedUrl(link);
      return embedUrl ? [new URL(embedUrl).hostname] : [];
    });
    const observed = exact.flatMap(({ link }) => {
      try {
        const url = new URL(link.startsWith("//") ? `https:${link}` : link);
        return url.protocol === "https:" ? [url.hostname.toLowerCase()] : [];
      } catch {
        return [];
      }
    });
    const releases = response.results.map((result) => this.normalizeRelease(result));
    return {
      ...base,
      requestStatus: "OK",
      results: response.results.length,
      translations: new Set(
        response.results.flatMap((result) =>
          result.translation?.id ? [result.translation.id] : [],
        ),
      ).size,
      exactEpisodeMatches: exact.length,
      acceptedEmbedCandidates: accepted.length,
      observedEmbedHosts: [...new Set(observed)].sort(),
      embedHosts: [...new Set(accepted)].sort(),
      releases,
    };
  }
}

export const kodikService = new KodikService();
