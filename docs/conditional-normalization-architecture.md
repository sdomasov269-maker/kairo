# Conditional playback normalization architecture

Status: design only. No normalization component in this document is connected to the production playback runtime.

## Goals and invariants

- Preserve `/api/stream/{sessionId}/master.m3u8` and the current `KairoPlaybackEngine` contract.
- Pass healthy sources through unchanged and remain provider-independent.
- Select the least expensive normalization level supported by evidence.
- Keep upstream URLs, credentials, cookies, and signed queries server-side.
- Do not execute FFmpeg in a React render, route lifecycle, or ordinary serverless request.
- V1 targets authorized HLS with H.264 video, AAC audio, and MPEG-TS or compatible inputs. DASH and other codecs are unsupported, passed through, or delegated to a healthy fallback.

## Data paths

```text
Healthy source

Provider -> PlaybackCandidate -> PlaybackSession -> StreamProxy
         -> StreamResourceStore -> opaque /api/stream tokens -> Shaka
```

```text
Unhealthy source

Provider -> PlaybackCandidate -> SourceHealthAnalyzer -> NormalizationPolicy
         -> NormalizationCoordinator -> NormalizationWorker
         -> NormalizedMediaStore -> StreamResourceStore
         -> opaque /api/stream tokens -> Shaka
```

```text
Shared job

Session A --\
Session B ---+-> cacheKey -> one normalization job -> shared artifact
Session C --/                                      -> session-scoped tokens
```

The normalized manifest is registered as an internal stream resource. Existing manifest rewriting can tokenize its local segment references without provider-specific logic. Normalized output is already durable media storage, so it bypasses the raw `SegmentCache`; placing the ordinary segment cache above it would create a redundant third copy.

## Components and boundaries

### SourceHealthAnalyzer

Consumes only validated internal resources. It parses the manifest and probes a bounded sample: startup segments plus selected early boundaries. It reports facts, confidence, reasons, metrics, `analyzerVersion`, and analysis time. It neither chooses a candidate nor launches FFmpeg.

Initial signals are EXTINF/coverage mismatch, presentation intervals above 1.5 times nominal cadence, DTS discontinuity, A/V skew jump, and non-random-access boundary ratio. No single non-IDR start or PTS overlap is sufficient. A suggested initial budget is manifest parsing plus at most 6–10 downloaded segments and 5–10 boundaries, bounded by bytes, packets, and wall time. Results are cached by source fingerprint and analyzer version.

### NormalizationPolicy

Pure decision logic returning `PASS_THROUGH`, `NORMALIZE`, `FALLBACK`, or `REJECT` and one minimum level. It considers analyzer confidence, proven capabilities, healthy alternate candidates, and available capacity. Analyzer facts and policy remain independently versioned.

### NormalizationCoordinator

Owns per-cache-key request coalescing, state, consumer references, queue admission, fairness, cancellation, timeouts, and resource budgets. It does not encode. Ten sessions requesting one fingerprint/profile/region share one job. Releasing the last consumer may cancel early work; shared or nearly complete work can continue according to an explicit retention policy.

### NormalizationWorker

Runs behind a subprocess/task boundary and accepts typed, validated local inputs plus an argument array. It never accepts an arbitrary user URL or builds a shell command. Stdout/stderr, staging bytes, process duration, and output size are bounded. V1 preserves resolution and detected nominal FPS; it must never convert 25/30/60 fps to 24000/1001. Healthy audio is copied. CFR repair inserts/repeats frame positions and is not motion interpolation.

### NormalizedMediaStore

Separate namespace from raw cache, backed by persistent disk or object storage. Workers write `.tmp`, fsync/close, validate, and atomically publish. Startup and periodic cleanup remove stale temporary artifacts. Quota, maximum artifact/source size, TTL, and LRU pressure are mandatory.

## Health and policy contracts

The proposed inactive TypeScript contracts live in `src/server/playback/normalization`. Health states are `healthy`, `suspect`, `normalization-recommended`, and `unsupported`; confidence is clamped conceptually to 0–1.

| Evidence and capacity | Decision |
|---|---|
| Healthy source | `PASS_THROUGH / NONE` |
| Low confidence | fallback when healthy alternate exists; otherwise pass through and retain evidence |
| Duration metadata mismatch only, proven safe | `NORMALIZE / MANIFEST_ONLY` |
| Boundaries can be cut on existing IDRs without packet loss | `NORMALIZE / RESEGMENT_COPY` |
| Encoded cadence, DTS, or A/V timing defect | `NORMALIZE / VIDEO_REENCODE` |
| Healthy alternate provider exists | prefer `FALLBACK` over compute |
| Capacity unavailable | fallback; reject only when policy forbids unsafe pass-through and no fallback exists |
| Unsupported input | fallback or reject |

Levels:

- `NONE`: current proxy path.
- `MANIFEST_ONLY`: rewrite only proven incorrect metadata; it cannot repair encoded cadence holes.
- `RESEGMENT_COPY`: allowed only after keyframe and packet-retention validation. It failed for the studied corpus and is not a default.
- `VIDEO_REENCODE`: preserve detected cadence and resolution, align IDRs to output segments, copy healthy audio, and emit genuinely independent segments.

## Fingerprint and cache key

The source fingerprint must not be a session ID or secret URL. It combines canonical content/episode identity, translation/audio variant, selected rendition/quality, provider-independent candidate identity, sanitized manifest structure hash, and sampled segment content hashes. Signed URL rotation must not change identity when content is unchanged.

```text
cacheKey = SHA256(
  sourceFingerprint +
  analyzerVersion +
  normalizationProfileVersion +
  normalizationLevel +
  renditionIdentity +
  region(start,end or full)
)
```

Artifacts may be reused across sessions, while every public resource token remains session-scoped. Profile changes to codec, FPS, GOP, audio, frame insertion, or segment policy invalidate old cache entries. A physical translation or quality change produces a different fingerprint. V1 normalizes only the selected rendition; it does not build an ABR ladder.

## State and readiness

```text
UNKNOWN -> ANALYZING -> HEALTHY
                    \-> NORMALIZATION_REQUIRED -> QUEUED -> PROCESSING
                                                      |-> READY_FOR_PLAYBACK -> READY
                                                      \-> FAILED
Any queued/processing state -> CANCELLED when policy permits
```

`READY_FOR_PLAYBACK` is distinct from job completion: the manifest and a safe initial media span exist, validate, and satisfy the configured forward reserve. The user must not wait for a full episode when incremental delivery is proven safe.

Two production strategies remain possible:

1. Full-source: static VOD manifest, simplest continuity and recovery, but greater startup/storage cost.
2. Windowed: initial normalized window followed by ahead-of-playhead processing. This is preferred only after Phase 5A.6 proves entry and exit splice continuity.

A growing VOD manifest risks client refresh semantics. Prefer staged immutable window manifests until a Shaka dynamic-manifest experiment proves safe. Neither mechanism is implemented here.

## Startup and session integration

Session creation performs a cached health lookup or a tightly bounded probe. Healthy candidates immediately use the current session path. A normalization decision creates internal delivery metadata (`direct-proxy`, `normalized`, or `fallback`) without exposing it in the public session DTO. For normalized delivery, playback starts only at `READY_FOR_PLAYBACK`; completion continues ahead when windowed operation is validated.

Source scoring should eventually rank a healthy direct alternative above an equivalent source requiring re-encode. This is an extension point, not a current scoring change. Runtime boundary evidence may later mark a fingerprint suspect, but automatic mid-playback switching/watchdogs are explicitly out of scope.

## Job and resource policy

Initial values must be configuration, not constants embedded in player code:

- global maximum concurrent workers, initially conservative and benchmark-driven;
- bounded queue length with per-source dedupe and per-user fairness;
- startup, region, and total job timeouts;
- maximum staged input/output bytes and subprocess log bytes;
- global normalized-store quota, per-artifact cap, TTL, and LRU eviction;
- streamed local input/output rather than whole-episode buffers.

The 42-second experiment took 7.303 seconds (about 5.75 times real time) and produced 61.5% more bytes. A linear extrapolation would place a 23-minute single-worker encode near four minutes, but codec complexity, I/O, hardware, and concurrency make that estimate non-authoritative. Full-episode production benchmarking is required.

## Failure behavior

| Failure | Behavior |
|---|---|
| Probe fails | mark suspect/unsupported; prefer healthy fallback; do not encode blindly |
| FFmpeg unavailable or worker crashes | fail job, delete temporary output, use fallback policy |
| Startup/region timeout | abort bounded work, preserve already published immutable artifacts, fallback |
| Disk full/quota exceeded | reject admission or evict eligible LRU entries before work; never expose partial files |
| Cache publish fails | normalized artifact remains unavailable; do not route sessions to it |
| Upstream expires during staging | retry only through validated resource/session logic or select fallback |
| Consumer disconnects | release reference; cancel only when no consumers and retention policy allows |

Pass-through is allowed only when policy deems the defect non-fatal. A source known to be unplayable is not silently served because capacity is unavailable.

## Security and observability

Workers prefer validated cached inputs and cannot become an SSRF bypass or arbitrary downloader. If future workers require upstream access, they must consume the existing validated resource abstraction and server-held headers. Rights to fetch, cache, and process media remain a prerequisite.

Sanitized events: `normalization.analysis.start/result`, `normalization.job.start/ready/complete/fail`, and `normalization.cache.hit/miss`. Never log URLs, cookies, authorization headers, or signed queries. Metrics include analysis latency, queue wait, processing wall/CPU time, normalized media seconds per processing second, cache hit rate, normalized/raw byte ratio, and failure rate.

## Deployment

Normal Vercel/serverless request execution is not sufficient: local persistence, FFmpeg availability, long-running processes, predictable CPU, cancellation, and shared coordination are not guaranteed. Recommended progression:

1. V1: coordinator in the playback backend plus an isolated worker subprocess on a suitable persistent host; shared filesystem store if deployment is single-node.
2. Scale-out: containerized/dedicated workers and shared object storage, with a durable job coordinator.

A separate microservice is justified by deployment or scale, not by style. Development outputs always live outside the watched repository to avoid HMR loops.

## Relationship to raw SegmentCache

Normalization and the browser-first raw cache tee are independent. The later raw-cache change should return the browser branch immediately while a bounded background branch writes cache. It must not be bundled with normalization implementation. Raw inputs follow their own TTL after worker retry/diagnostic needs expire; normalized artifacts follow the normalized-store policy.

## Phase 5A.6: normalized window splice feasibility

Use the proven profile without tuning it. Prepare a corpus with an untouched prefix, a minimal affected region re-encoded with decode-safe GOP preroll/postroll, and an untouched suffix. Produce both a full normalized control and a hybrid candidate.

Acceptance requires, at both entry and exit splice:

1. ffprobe PTS/DTS and A/V continuity within normal quantization;
2. no packet loss outside the declared replacement region;
3. keyframe-safe segment starts and truthful EXTINF values;
4. one continuous MSE TimeRange in Shaka;
5. three sequential headed-Chromium rVFC runs;
6. target and splice-window largest intervals below 80 ms, no midstream waiting/gap jump, no dropped/corrupted-frame regression;
7. duration and A/V alignment preserved through the end of the clip.

If either splice cannot be proven, windowed normalization remains disabled and the only proven strategy is a continuous/full-source encode. Phase 5A.6 must not implement the production coordinator or worker pool.

## Deferred production work

No FFmpeg worker, coordinator instance, cache, session delivery mode, source scoring change, buffer tuning, watchdog, or frontend/provider branch is activated by this design.
