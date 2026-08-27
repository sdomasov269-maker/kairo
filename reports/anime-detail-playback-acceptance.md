# Production anime detail playback acceptance

Date: 2026-08-24  
Browser: headed Chrome 151  
Route: `/anime/anilist-156067-tondemo-skill-de-isekai-hourou-meshi?episode=1#player`  
Shikimori ID: `53446`

## Integration

- The production `PlayerPlaceholder` import/render was replaced by `AnimePlaybackPanel`.
- The server page passes only `shikimoriId`, initial episode, episode count, and slug.
- Translations and `PlaybackDescriptor` are resolved through the existing Next playback APIs.
- Translation and episode changes abort the previous request and use a generation guard.
- `KairoPlayer` remains provider-independent and selected hls.js/MSE in Chrome.
- The debug route remains available.

## Headed browser evidence

```text
translations: 13
progression: 9.783 -> 14.809
pause: 14.849 -> 14.849
resume: 17.900
seek continuation: 57.454
fullscreen: true
episode switch: PASS
translation switch: PASS
hls mode: mse
stalled: 0
waiting: 1
fatal HLS errors: 0
non-fatal HLS errors: 0
dropped frames: 2 / 621
manifest requests: 6
segment requests: 24
media error: null
```

The single `waiting` event occurred during normal startup/source replacement. No
stalled event or playback freeze was observed.

## Responsive

```text
desktop: viewport 1425, scrollWidth 1425, PASS
tablet:  viewport 885,  scrollWidth 885,  PASS
mobile:  viewport 375,  scrollWidth 375,  PASS
```

The player stayed inside the content container at all three widths.

## Navigation

`/watch/anilist-156067-tondemo-skill-de-isekai-hourou-meshi/1?season=1`
redirected to
`/anime/anilist-156067-tondemo-skill-de-isekai-hourou-meshi?episode=1&season=1`.

## Verification

```text
Tests: PASS (163/163)
Playback tests: PASS (6/6)
Typecheck: PASS
Lint: PASS
Production build: PASS
```

WatchProgress integration: DEFERRED. Restoring the retired playback architecture
was not required for this production integration.
