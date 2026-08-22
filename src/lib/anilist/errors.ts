export class AniListRequestError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  readonly responseBody?: string;
  readonly parsedResponseBody?: unknown;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    status: number | null,
    retryable: boolean,
    responseBody?: string,
    parsedResponseBody?: unknown,
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AniListRequestError";
    this.status = status;
    this.retryable = retryable;
    this.responseBody = responseBody;
    this.parsedResponseBody = parsedResponseBody;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isRetryableAniListStatus(status: number): boolean {
  return (
    status === 403 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  );
}

export function isTemporarilyDisabledAniListError(
  status: number,
  message: string | undefined,
): boolean {
  return (
    status === 403 &&
    /temporarily disabled|severe stability issues/i.test(message ?? "")
  );
}
