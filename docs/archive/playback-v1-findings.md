# Kairo Player v1 — archived findings

Status: archived on 2026-08-22. None of the architecture described here is connected to production.

## What was tested

- Direct HLS resolution was proven possible through the Kodik research path. The browser-visible URL baseline removed the need for an in-memory playback session, but it intentionally exposed the resolved media URL to the client.
- Shaka successfully loaded the resolved HLS source in a local production smoke. The media element reached `readyState = 4`, exposed a finite duration, and advanced playback time without a media error.
- Player v1 used Shaka with centralized buffering configuration. Buffer tuning was kept separate from source-resolution and normalization investigations.
- The retained diagnostic scripts measured frame cadence with `requestVideoFrameCallback`, buffered ranges, Shaka buffering state, and segment-boundary proximity.

## Timing and segment findings

- The investigation distinguished buffer starvation from stalls that occurred while media remained buffered.
- Segment timestamp analysis tracked PTS/DTS deltas, overlaps, duration error, A/V skew, and whether visible frame gaps correlated with segment boundaries.
- Manifest-only repair cannot fix encoded cadence holes. Resectioning without re-encoding was considered valid only after keyframe and packet-retention proof.
- The studied resegment-copy approach did not become a safe default. The only normalization strategy described as proven for defective cadence was a continuous/full-source encode; windowed splice delivery remained unproven.

## Normalization A/B findings

- A 42-second normalization experiment took 7.303 seconds and increased bytes by 61.5%. Extrapolation to full episodes was explicitly considered non-authoritative.
- Acceptance criteria for a hybrid normalized window included continuous PTS/DTS and A/V timing, no packet loss outside the replacement region, truthful segment durations, one continuous MSE range, and repeated headed-browser frame-cadence runs.
- No production normalization coordinator, worker pool, watchdog, source-scoring adjustment, or FFmpeg route integration was completed.

## Deployment limitation

- The session/proxy design depended on process-local playback sessions, resource mappings, and filesystem cache state. Separate serverless invocations could not rely on that state, producing missing-session/404 failure modes.
- The proposed persistent backend required local persistence, long-running work, predictable CPU, cancellation, and shared coordination that ordinary Vercel request execution does not guarantee.
- A separate playback backend was explored, then rejected for the current product phase because it increased deployment and operational complexity while the site itself remained the priority.

## Why v1 was retired

- The production path combined provider resolution, session lifetime, manifest rewriting, proxying, cache state, diagnostics, and player runtime before the product needed that infrastructure.
- Direct HLS simplified deployment but retained provider-specific and browser-visible media concerns.
- Player v1 was removed so the main Kairo site can deploy without video infrastructure. A future Player v2 should begin with a new requirements and deployment design rather than inherit these runtime assumptions.

## Preserved research assets

- `scripts/playback/` remains an offline diagnostics and normalization-feasibility archive. Scripts that target the removed `/api/stream` session routes are historical harnesses, not commands for the current application.
- `docs/conditional-normalization-architecture.md` remains the detailed design record; it is not a production contract.
