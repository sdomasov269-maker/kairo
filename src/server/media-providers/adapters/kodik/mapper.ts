import { KodikPartnerAccessRequiredError } from "./errors.ts";
export type KodikTranslation = {
  id: string;
  language: string;
  label: string;
  studio?: string;
  kind?: "DUB" | "VOICE_OVER" | "ORIGINAL";
};
export const normalizeKodikTranslation = (input: {
  id: string;
  label: string;
  language?: string;
  studio?: string;
  kind?: KodikTranslation["kind"];
}): KodikTranslation => ({
  id: input.id,
  label: input.label,
  language: input.language ?? "unknown",
  studio: input.studio,
  kind: input.kind,
});
export function mapKodikContractData(): never {
  throw new KodikPartnerAccessRequiredError(
    "Kodik mapping is unavailable until an official contract is provided",
  );
}
export const sanitizeKodikMetadata = (metadata: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => !/(url|iframe|token|cookie|referer|origin)/i.test(key),
    ),
  );
