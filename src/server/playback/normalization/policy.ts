import type { NormalizationDecision, SourceHealthResult } from "./contracts.ts";
export interface NormalizationPolicyInput { health: SourceHealthResult; hasHealthyFallback: boolean; normalizationCapacityAvailable: boolean; copyResegmentationSafe: boolean; minimumConfidence?: number }
export function decideNormalization(input: NormalizationPolicyInput): NormalizationDecision {
  const threshold = input.minimumConfidence ?? 0.75;
  if (input.health.status === "healthy") return { action: "PASS_THROUGH", level: "NONE", reason: "source-healthy" };
  if (input.health.status === "unsupported") return input.hasHealthyFallback ? { action: "FALLBACK", level: "NONE", reason: "source-unsupported" } : { action: "REJECT", level: "NONE", reason: "source-unsupported" };
  if (input.health.confidence < threshold) return input.hasHealthyFallback ? { action: "FALLBACK", level: "NONE", reason: "insufficient-confidence" } : { action: "PASS_THROUGH", level: "NONE", reason: "insufficient-confidence" };
  if (input.hasHealthyFallback) return { action: "FALLBACK", level: "NONE", reason: "healthy-alternate-preferred" };
  if (!input.normalizationCapacityAvailable) return { action: "FALLBACK", level: "NONE", reason: "normalization-capacity-unavailable" };
  const reasons = new Set(input.health.reasons);
  if (reasons.has("presentation-cadence-gap") || reasons.has("dts-discontinuity") || reasons.has("av-skew-jump")) return { action: "NORMALIZE", level: "VIDEO_REENCODE", reason: "encoded-timeline-defect" };
  if (reasons.has("non-random-access-boundaries") && input.copyResegmentationSafe) return { action: "NORMALIZE", level: "RESEGMENT_COPY", reason: "copy-resegmentation-safe" };
  if (reasons.size === 1 && reasons.has("duration-mismatch")) return { action: "NORMALIZE", level: "MANIFEST_ONLY", reason: "duration-metadata-only" };
  return { action: "PASS_THROUGH", level: "NONE", reason: "no-proven-safe-normalization" };
}
