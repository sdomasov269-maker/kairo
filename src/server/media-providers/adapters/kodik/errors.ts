export class KodikConfigurationError extends Error { constructor(message = "Kodik is disabled: official API configuration is required") { super(message); this.name = "KodikConfigurationError"; } }
export class KodikPartnerAccessRequiredError extends Error { constructor(message = "Kodik partner access and an official API contract are required") { super(message); this.name = "KodikPartnerAccessRequiredError"; } }
export class KodikTimeoutError extends Error {}
export class KodikNotFoundError extends Error {}
export class KodikUnauthorizedError extends Error {}
export class KodikRateLimitError extends Error {}
export class KodikSchemaError extends Error {}
export class KodikUnavailableError extends Error {}
export class KodikPlaybackPermissionError extends Error {}
