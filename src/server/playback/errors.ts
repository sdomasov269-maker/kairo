export class DirectPlaybackUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "DirectPlaybackUnavailableError";
  }
}

export class KodikWrapperResolverError extends DirectPlaybackUnavailableError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "KodikWrapperResolverError";
  }
}

export class RustResolverError extends DirectPlaybackUnavailableError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "RustResolverError";
  }
}
