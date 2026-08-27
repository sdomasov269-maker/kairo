# AnimeGO / CVH relay acceptance

Date: 2026-08-25  
Title: Shikimori `56735`, AnimeGO `3591`, episode `1`  
Voice: Dream Cast (`81`)  
Browser: headed Chrome 151, hls.js / MSE

## Upstream context

The live CVH manifest requires the signed URL plus the `User-Agent`, `Referer:
https://animego.org/`, and `Accept: application/json` headers used by
`anime_parsers_ru`. No Origin, cookie, or other session state was required in
the observed flow. These values and signed URLs remain inside the Python
provider session and are absent from browser descriptors, manifest bodies,
errors, and URLs.

## Relay and security

- In-memory opaque session ID; TTL 20 minutes.
- HTTPS upstream restricted to the provider-specific `.vkuser.net` suffix.
- Master and variant URI lines are rewritten to opaque resource IDs.
- Browser accepts no upstream URL or arbitrary forwarded headers.
- Connect/read timeouts are 5/20 seconds; gateway timeout is 30 seconds.
- Manifest limit is 2 MiB; individual relayed resource limit is 32 MiB.
- Segments stream through FastAPI and Next without whole-file buffering.
- Active HLS encryption is rejected as `UNSUPPORTED_PROTECTED_STREAM`.
- Unit tests cover expired sessions, unknown resources, arbitrary hosts,
  signed-URL opacity, and protected manifests.

## Headed browser telemetry

```text
CVH options latency: 689 ms
CVH provider resolve latency: 3974 ms
CVH startup latency: 589 ms
Relay master latency: 855 ms
Relay variant latency: 1703-1807 ms
Relay segment latency: 712-1126 ms

Completed relay manifests: 3 (HTTP 200)
Completed relay segments: 17 (HTTP 200)
Failed CVH requests during acceptance: 0
Browser requests to vkuser.net: 0

currentTime before pause: 30.56 s
currentTime after 1 s pause: 30.56 s
currentTime after resume + 35 s seek: 75.49 s
bufferAhead after seek: 98.51 s
waiting: 1 (startup)
stalled: 0
fatal HLS errors: 0
non-fatal HLS errors: 0
dropped frames: 3 / 1014
largest steady frame gap: 83.3 ms
media error: null
```

The later single `net::ERR_ABORTED` relay request occurs only when the script
intentionally tears down CVH to switch to the unavailable MP4 choice and then
to Kodik; the snapshot taken before teardown has zero failed CVH requests.

A separate byte-range probe returned HTTP 206 and 1024 bytes for
`Range: bytes=0-1023`; the relay preserves `Accept-Ranges` and supplies a valid
`Content-Range` when the upstream omits it.

The control Kodik run remained on MSE, started in 3463 ms, and progressed to
10.54 s. Production anime detail remains Kodik-only; no ProviderManager or
automatic Kodik-to-CVH failover was added.

```text
CVH relay manifest: PASS
CVH relay segments: PASS
Same-origin browser transport: PASS

CVH HLS playback: PASS
Progression: PASS
Pause/resume: PASS
Seek: PASS

Real freezes: NO
Waiting: 1
Stalled: 0
Fatal HLS errors: 0
Dropped frames: 3 / 1014
Largest frame gap: 83.3 ms

Upstream URLs exposed to browser: NO
Arbitrary proxy possible: NO

CVH READY AS SECOND PROVIDER: YES
```
