# Direct Kodik playback

## Architecture

Previously the watch workspace resolved a Kodik player link in the browser and
then constructed a local master manifest. The new server-only descriptor flow is:

```text
Kodik material.link -> PlaybackResolverService -> kodikwrapper -> HLS -> Kairo Player
                                                   -> Rust resolver (optional) -> HLS
                                                   -> Kodik iframe (final fallback)
```

`KAIRO_DIRECT_KODIK_PLAYBACK=true` enables direct resolution. When it is absent
or `false`, the existing Kodik iframe is used immediately. A failure from either
direct resolver always returns the iframe descriptor, so the player is never
left empty.

## Resolver details

`KodikWrapperResolver` is server-only and uses `VideoLinks.parseLink` with
`extended: true`, dynamically discovers the current video-info endpoint, then
calls `VideoLinks.getLinks`. The endpoint is cached in memory for 15 minutes;
a failed links request evicts it, discovers it again, and retries once.

The optional Rust adapter only runs when `KAIRO_KODIK_RUST_RESOLVER_URL` is set.
It expects `POST /resolve` with `{ "link": "..." }` and a descriptor-like
`sources` response. No Rust process is started by Kairo.

Both external paths have an eight-second timeout. Only direct HLS URLs and
normalised skip ranges are returned to the client; Kodik endpoint details,
cookies, and resolver metadata remain on the server. Production logging does
not include stream URLs.

## Browser playback and fallback

The existing Kairo HLS player attaches `hls.js` when Media Source is supported
and otherwise uses native HLS. Native media events remain the source of watch
progress, playback state, seek, volume, rate, PiP, fullscreen, and the quality
menu. A fatal HLS error refreshes the descriptor once; a second failure switches
to `KodikPlayerShell`, whose postMessage bridge remains limited to iframe mode.

Live verification confirmed the full canonical Kodik flow through `getLinks`
with 360p, 480p, and 720p HLS manifests. Browser hls.js playback and CDN CORS
were also confirmed: the selected manifest and its `.ts` segments load directly
from the Kodik CDN.

Each quality is a separate fixed manifest, so Kairo selects one source at a time
rather than generating a synthetic adaptive master playlist. Quality changes
destroy the old Hls instance, preserve time/play state/volume/mute/rate, attach
one new instance, and restore that state after metadata is available. The iframe
is still created only after direct resolver or fatal playback fallback.

Set `KAIRO_PLAYBACK_DEBUG=true` for server resolver diagnostics. Do not proxy
manifests or segments through Next.js; if CDN CORS later prevents direct
playback, use a separately operated media gateway with signed URLs.

## Runtime validation

- Kodikwrapper direct HLS resolution is confirmed for 360p, 480p, and 720p.
- Browser-to-CDN CORS is confirmed for manifests and media segments.
- The tested Kodik stream reproduced a Chromium native-HLS media failure around
  446.96 seconds. This does not claim native HLS is generally broken.
- The development-only `/debug/hls` baseline, using default `new Hls()` and
  MSE, passed the same 430–467 second range without a fatal HLS or native video
  error while retaining roughly 30–35 seconds of buffer ahead.
- Kairo therefore selects hls.js whenever `Hls.isSupported()` is true; native
  HLS is only the fallback for browsers without MSE+hls.js support.

Normal waiting, stalled, and non-fatal aborted fragment requests during seek do
not select iframe fallback. The direct player keeps one active Hls instance per
active source; quality changes replace that instance and restore media state.
