export type SourceHealthStatus = "healthy" | "suspect" | "normalization-recommended" | "unsupported";
export type SourceHealthReason = "duration-mismatch" | "presentation-cadence-gap" | "dts-discontinuity" | "av-skew-jump" | "non-random-access-boundaries" | "unsupported-codec-or-container";
export interface SourceHealthResult { status: SourceHealthStatus; confidence: number; reasons: SourceHealthReason[]; metrics: { nominalFrameDurationMs?: number; maxPresentationGapMs?: number; maxDurationMismatchMs?: number; nonRandomAccessBoundaryRatio?: number; avSkewJumpMs?: number }; analyzerVersion: string; analyzedAt: Date }
export type NormalizationLevel = "NONE" | "MANIFEST_ONLY" | "RESEGMENT_COPY" | "VIDEO_REENCODE";
export type NormalizationAction = "PASS_THROUGH" | "NORMALIZE" | "FALLBACK" | "REJECT";
export interface NormalizationDecision { action: NormalizationAction; level: NormalizationLevel; reason: string }
export interface NormalizationProfile { profileVersion: string; videoCodec: "h264"; frameRatePolicy: "preserve-detected-cfr"; frameInsertionPolicy: "repeat-nearest-frame-position"; gopPolicy: "segment-aligned-idr"; audioPolicy: "copy-when-healthy"; segmentPolicy: "keyframe-aligned-hls"; preserveResolution: true }
export interface SourceHealthAnalyzer { analyze(input: { sourceFingerprint: string; signal?: AbortSignal }): Promise<SourceHealthResult> }
export interface NormalizationWorker { normalize(input: { sourceFingerprint: string; profile: NormalizationProfile; region?: { startMs: number; endMs: number }; signal?: AbortSignal }): Promise<{ artifactKey: string }> }
export interface NormalizedMediaStore { get(cacheKey: string): Promise<{ artifactKey: string } | null>; publishAtomically(cacheKey: string, temporaryArtifactKey: string): Promise<void>; remove(cacheKey: string): Promise<void> }
export type NormalizationJobState = "UNKNOWN" | "ANALYZING" | "HEALTHY" | "NORMALIZATION_REQUIRED" | "QUEUED" | "PROCESSING" | "READY_FOR_PLAYBACK" | "READY" | "FAILED" | "CANCELLED";
export interface NormalizationCoordinator { request(input: { cacheKey: string; consumerId: string; profile: NormalizationProfile; region?: { startMs: number; endMs: number }; signal?: AbortSignal }): Promise<{ state: NormalizationJobState; artifactKey?: string }>; release(cacheKey: string, consumerId: string): Promise<void> }
