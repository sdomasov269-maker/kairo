# Kodik Player browser acceptance

Date: 2026-08-23  
Browser: installed Google Chrome, headed, controlled by local Playwright 1.62.1  
Title: Shikimori `53446`, episode `1`, API-selected translation

## Result

```text
HLS browser playback: PASS
HLS progression: PASS
HLS seek: PASS
HLS stall reproduced: YES in Chrome native-HLS path; NO repeating stall in hls.js/MSE path

MP4 browser playback: PASS
MP4 progression: PASS
MP4 seek: PASS
MP4 stall reproduced: NO

Play/pause: PASS
Audio element state: PASS
Fullscreen: PASS

CORS: PASS
Range: PASS
```

No recovery behavior was enabled or added.

## hls.js/MSE evidence

Chrome's current native capability check selected native HLS in the default run.
A second run used a test-only `canPlayType` capability override before page load,
without changing application code, to exercise the existing hls.js branch.

- `manifestLoaded=true`, level `0`.
- `currentTime`: `0.18 -> 11.83`; after resume `11.96 -> 16.94`.
- Timeline seek reached `51.98`; playback then advanced to `64.01` and finally `124.22`.
- Final `readyState=4`, `networkState=2`, duration `1434.92`.
- Final buffered range `0.08-156.01`, buffer ahead `31.79s`.
- `video.error=null`, `muted=false`, `volume=1`.
- No fatal HLS error. One non-fatal `mediaError:bufferSeekOverHole` accompanied the deliberate seek.
- Network: 2 manifest requests, 26 segment requests, 28 responses with `Access-Control-Allow-Origin: *`.

Observed hls.js events:

| Observed at (UTC) | Event | Time | readyState | networkState | buffer ahead | HLS error |
|---|---|---:|---:|---:|---:|---|
| 10:06:25.108 | waiting (startup) | 0.00 | 1 | 2 | 0.00 | none |
| 10:06:44.486 | waiting (seek) | 46.50 | 1 | 2 | 1.52 | `mediaError:bufferSeekOverHole` |

There was no repeating hls.js stall during the subsequent progression to `124.22s`.

## Native-HLS stall observation

The unmodified Chrome capability path played continuously from `0` to `123.37s`,
including pause/resume and a 45-second timeline seek. It nevertheless emitted
repeating `stalled` events near segment boundaries while media remained buffered.
No HLS error was reported, and progression continued after every event.

| Observed at (UTC) | Event | Time | readyState | networkState | buffer ahead | HLS error |
|---|---|---:|---:|---:|---:|---|
| 10:02:52.785 | stalled | 3.06 | 4 | 2 | 8.82 | none |
| 10:02:59.973 | stalled | 10.24 | 4 | 2 | 7.64 | none |
| 10:03:06.083 | stalled | 14.23 | 4 | 2 | 9.61 | none |
| 10:03:21.176 | stalled | 58.19 | 4 | 2 | 7.73 | none |
| 10:03:27.286 | stalled | 64.30 | 4 | 2 | 7.62 | none |
| 10:03:33.394 | stalled | 70.40 | 4 | 2 | 7.56 | none |
| 10:03:39.508 | stalled | 76.52 | 4 | 2 | 7.40 | none |
| 10:03:45.257 | stalled | 82.27 | 4 | 2 | 7.57 | none |
| 10:03:51.368 | stalled | 88.38 | 4 | 2 | 7.54 | none |
| 10:03:57.116 | stalled | 94.13 | 4 | 2 | 7.83 | none |
| 10:04:03.598 | stalled | 100.61 | 4 | 2 | 7.23 | none |
| 10:04:09.348 | stalled | 106.36 | 4 | 2 | 7.48 | none |
| 10:04:15.102 | stalled | 112.11 | 4 | 2 | 7.77 | none |
| 10:04:21.207 | stalled | 118.22 | 4 | 2 | 7.58 | none |

The waiting event at `45.70s`, `readyState=1`, buffer ahead `0`, occurred during the deliberate seek and is not classified as the repeating baseline stall.

## MP4 evidence

- `currentTime`: `0.02 -> 11.59`.
- Pause held at `11.64`; playback resumed.
- Timeline seek reached `46.73`; playback advanced to `58.75` and finally `88.83`.
- Final `readyState=4`, `networkState=1`, buffer ahead `2.45s`.
- `video.error=null`, `muted=false`, `volume=1`.
- Three MP4 media requests were observed. Range requests returned partial content; the combined acceptance runs recorded both MP4 and HLS Range traffic.
- MP4 emitted transient `waiting` at startup (`0.35s`) and during seek (`41.10s`), but no `stalled` event and no repeating timestamp stall.

## Other evidence

- Headed `requestFullscreen()` entered fullscreen successfully.
- One `net::ERR_ABORTED` media request occurred when switching source from HLS to MP4; this is the expected teardown of the old source.
- Two unrelated 404 console resource messages were present; no HLS/MP4 media request returned 404 and both media elements had `video.error=null`.
- Production anime detail was not changed. `PlayerPlaceholder` remains active.

## Chrome 151 native HLS vs hls.js/MSE policy investigation

Follow-up date: 2026-08-24.

### Capability and native mechanism

```text
navigator.userAgent = Mozilla/5.0 (Windows NT 10.0; Win64; x64)
  AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
canPlayType(application/vnd.apple.mpegurl) = maybe
canPlayType(application/x-mpegURL) = maybe
Hls.isSupported() = true
MediaSource AVC/AAC support = true
```

Chrome therefore exposed both transports. The old policy selected native solely
because `canPlayType()` returned a non-empty string.

CDP Media-domain evidence confirmed that this was Chromium's built-in HLS
pipeline rather than MSE: `currentSrc` remained the manifest URL instead of a
`blob:` URL, and Chrome reported `kHlsSegmentFetch` and `kHlsBufferedRanges`.
The active decoders were `D3D11VideoDecoder` for H.264 and
`FFmpegAudioDecoder` for AAC.

### Controlled transport comparison

Both branches used the same descriptor, translation, manifest, episode, UI
actions, seek and observation duration.

| Metric | Chrome native HLS | hls.js / MSE |
|---|---:|---:|
| Final currentTime | 116.48s | 117.06s |
| stalled | 14 | 0 |
| waiting | 2 | 2 |
| Decoded frames | 2192 | 2211 |
| Dropped frames | 10 | 0 |
| Largest steady frame gap | 125.1ms | 69.5ms |
| readyState | 4 | 4 |
| Media error | none | none |

Native segment requests settled into a six-second cadence near `48.49`,
`54.39`, `60.40`, `66.50`, `72.42`, `78.38`, `84.30`, `90.43`, `96.54`,
`102.36`, `108.36` and `114.36`. The repeated native `stalled` events had the
same approximately six-second cadence, confirming correlation with HLS segment
boundaries/fetching, although the event and request phases were offset.

Every one of the 14 native `stalled` events was classified
`STALLED_EVENT_ONLY`. At +100ms, +250ms, +500ms and +1000ms, `currentTime` and
decoded frame counts continued to increase. The +1000ms `currentTime` deltas
were approximately 0.999-1.003 seconds. There were no `PLAYBACK_FREEZE` cases,
so freeze-duration buckets are not applicable. The 125.1ms maximum steady frame
callback gap falls in the 50-150ms bucket, but it did not stop the media clock.

### Policy change and ordinary-Chrome acceptance

Kairo now applies this isolated policy:

```text
Safari with native HLS -> native
hls.js supported       -> MSE
native-only fallback   -> native
otherwise              -> unsupported
```

Chrome 151, without any capability override, automatically selected `mse`.
The hls.js instance uses default `new Hls()` configuration; no recovery, retry,
buffer tuning or seek nudge was added.

Final ordinary-Chrome results after a roughly 2.5-minute HLS run:

```text
Chrome selected mode: MSE
HLS progression: PASS (0.18 -> 184.25)
HLS seek: PASS (51.87 -> 63.91 -> 184.25)
Real playback freezes: NO
stalled events: 0
waiting events: 2 (startup and deliberate seek)
largest active-playback frame gap: 76.6ms
dropped frames: 0 / 3932
fatal HLS errors: 0
non-fatal HLS errors: 1 (bufferSeekOverHole during deliberate seek)
final readyState: 4
final networkState: 2
final buffer ahead: 31.77s
```

The raw 2196.7ms frame-callback interval in the harness spanned the deliberate
two-second pause and is excluded from playback-freeze analysis. Startup and seek
intervals are likewise reported separately from steady playback.

MP4 regression remained successful: progression, pause/resume and seek passed;
`video.error` stayed null.

**READY TO INTEGRATE INTO ANIME DETAIL: YES.** Production anime detail remains
unchanged in this pass.
