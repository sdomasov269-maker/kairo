import {
  KodikConfigurationError,
  KodikPartnerAccessRequiredError,
} from "./errors.ts";
export type KodikClientConfiguration = {
  enabled?: boolean;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
};
export class KodikClient {
  readonly enabled: boolean;
  readonly baseUrl?: string;
  readonly tokenConfigured: boolean;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  constructor(config: KodikClientConfiguration = {}) {
    this.enabled =
      config.enabled ?? process.env.KODIK_PROVIDER_ENABLED === "true";
    this.baseUrl =
      (config.baseUrl ?? process.env.KODIK_API_BASE_URL) || undefined;
    this.tokenConfigured = Boolean(config.token ?? process.env.KODIK_API_TOKEN);
    this.timeoutMs =
      config.timeoutMs ?? Number(process.env.KODIK_TIMEOUT_MS ?? 10000);
    this.maxRetries =
      config.maxRetries ?? Number(process.env.KODIK_MAX_RETRIES ?? 3);
  }
  assertConfigured(): never {
    if (!this.enabled || !this.baseUrl || !this.tokenConfigured)
      throw new KodikConfigurationError();
    throw new KodikPartnerAccessRequiredError();
  }
  searchTitles(): never {
    return this.assertConfigured();
  }
  getTitle(): never {
    return this.assertConfigured();
  }
  getEpisodes(): never {
    return this.assertConfigured();
  }
  getPlayback(): never {
    throw new KodikPartnerAccessRequiredError(
      "Kodik playback permission is not verified",
    );
  }
}
