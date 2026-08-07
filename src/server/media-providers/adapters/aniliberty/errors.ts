export class AniLibertyError extends Error {
  readonly status: number | null; readonly retryable: boolean;
  constructor(message: string, status: number | null = null, retryable = false) { super(message); this.status = status; this.retryable = retryable; this.name = new.target.name; }
}
export class AniLibertyTimeoutError extends AniLibertyError {}
export class AniLibertyNotFoundError extends AniLibertyError {}
export class AniLibertyUnauthorizedError extends AniLibertyError {}
export class AniLibertyRateLimitError extends AniLibertyError { readonly retryAfterMs?: number; constructor(message: string, retryAfterMs?: number) { super(message, 429, true); this.retryAfterMs = retryAfterMs; } }
export class AniLibertySchemaError extends AniLibertyError {}
export class AniLibertyUnavailableError extends AniLibertyError {}
export class AniLibertyPlaybackPermissionError extends AniLibertyError {}
