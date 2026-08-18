import { TitleProviderError } from "./http.ts";
import type { ProviderLookup } from "./types.ts";

export const RETRYABLE_LOOKUP_STATUSES = [
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "TEMPORARY_ERROR",
] as const;
export type LookupCacheStatus =
  | "FOUND"
  | "NOT_FOUND"
  | "AMBIGUOUS"
  | "NOT_ELIGIBLE"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "CLIENT_ERROR"
  | "TEMPORARY_ERROR";

export type LookupClassification = {
  status: LookupCacheStatus;
  retryable: boolean;
  httpStatus: number | null;
  error: string | null;
};

export function classifyLookup(lookup: ProviderLookup): LookupClassification {
  if (lookup.status === "found")
    return { status: "FOUND", retryable: false, httpStatus: null, error: null };
  if (lookup.status === "ambiguous")
    return {
      status: "AMBIGUOUS",
      retryable: false,
      httpStatus: null,
      error: null,
    };
  if (lookup.status === "not-eligible")
    return {
      status: "NOT_ELIGIBLE",
      retryable: false,
      httpStatus: null,
      error: null,
    };
  if (lookup.status === "not-found")
    return {
      status: "NOT_FOUND",
      retryable: false,
      httpStatus: null,
      error: null,
    };
  const status = Number(lookup.diagnostics?.status) || null;
  const error = String(lookup.diagnostics?.error ?? "Provider request failed");
  const type = String(lookup.diagnostics?.errorType ?? "");
  if (status === 404)
    return { status: "NOT_FOUND", retryable: false, httpStatus: status, error };
  if (status === 429)
    return {
      status: "RATE_LIMITED",
      retryable: true,
      httpStatus: status,
      error,
    };
  if (status && status >= 500)
    return {
      status: "SERVER_ERROR",
      retryable: true,
      httpStatus: status,
      error,
    };
  if (status && status >= 400)
    return {
      status: "CLIENT_ERROR",
      retryable: false,
      httpStatus: status,
      error,
    };
  if (type === "timeout")
    return { status: "TIMEOUT", retryable: true, httpStatus: null, error };
  return { status: "NETWORK_ERROR", retryable: true, httpStatus: null, error };
}

export function providerErrorDiagnostics(
  error: unknown,
): Record<string, unknown> {
  if (error instanceof TitleProviderError)
    return {
      error: error.message,
      status: error.status ?? null,
      retryable: error.retryable,
      errorType: error.kind,
      retryAfterMs: error.retryAfterMs ?? null,
    };
  const timeout =
    error instanceof Error &&
    (error.name === "AbortError" || /timeout|aborted/i.test(error.message));
  return {
    error: error instanceof Error ? error.message : "Unknown provider error",
    retryable: true,
    errorType: timeout ? "timeout" : "network",
  };
}

export function computeNextRetryAt(
  attemptCount: number,
  now = new Date(),
  retryAfterMs?: number | null,
): Date {
  const exponential = Math.min(
    24 * 60 * 60_000,
    60_000 * 2 ** Math.max(0, attemptCount - 1),
  );
  return new Date(now.getTime() + Math.max(retryAfterMs ?? 0, exponential));
}

export function canRetryLookup(
  row: {
    retryable: boolean;
    status: string;
    attemptCount: number;
    nextRetryAt: Date | null;
  },
  before: Date,
  maxAttempts: number,
) {
  return (
    row.retryable &&
    (RETRYABLE_LOOKUP_STATUSES as readonly string[]).includes(row.status) &&
    row.attemptCount < maxAttempts &&
    (!row.nextRetryAt || row.nextRetryAt <= before)
  );
}

export class LookupCircuitBreaker {
  private consecutive = 0;
  readonly threshold: number;
  constructor(threshold = 10) {
    this.threshold = threshold;
  }
  record(status: LookupCacheStatus) {
    if (status === "RATE_LIMITED" || status === "SERVER_ERROR")
      this.consecutive += 1;
    else this.consecutive = 0;
    return this.open;
  }
  get open() {
    return this.consecutive >= this.threshold;
  }
  get failures() {
    return this.consecutive;
  }
}
