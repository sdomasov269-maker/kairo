export class KodikConfigurationError extends Error {
  constructor(message = "Kodik REST provider is not configured") {
    super(message);
    this.name = "KodikConfigurationError";
  }
}

export class KodikRequestError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(
    message: string,
    status: number | null = null,
    code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "KodikRequestError";
    this.status = status;
    this.code = code;
  }
}

export class KodikResponseError extends Error {
  readonly code: string;

  constructor(message: string, code = "INVALID_RESPONSE") {
    super(message);
    this.name = "KodikResponseError";
    this.code = code;
  }
}
