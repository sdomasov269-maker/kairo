# ProviderManager acceptance

Date: 2026-08-25  
Browser: headed Chrome 151  
Title: Shikimori `56735`, AnimeGO `3591`

## Policy

Kodik is attempted first with a 5 second request timeout. Eligible upstream
failures continue sequentially through AnimeGO title resolution, CVH voices,
and CVH playback with bounded 8/6/8 second phase timeouts. Request, episode,
security, unsupported-media, and internal-contract failures do not fall back.
There is no racing or mid-playback provider switching.

## AUTO primary

```text
Selected provider: KODIK
Fallback used: NO
Resolve latency: 60 ms (warm), 2942 ms observed in an uncached run
Playback startup latency: 2718 ms
Progression: PASS (0.5 -> 5.53 s)
Seek: PASS (5.53 -> 45.15 s)
Episode switch: PASS (episode 2 preserved)
Translation switch: PASS
Fatal errors: 0
AnimeGO calls before forced fallback: 0
```

The production `/anime/anilist-169583-oh-boy-was-i-wrong-about-her` page called
the provider-independent `/api/playback/resolve` endpoint, received
`provider=kodik`, `fallbackUsed=false`, and rendered KairoPlayer.

## AUTO forced fallback

```text
Kodik failure: PROVIDER_UNAVAILABLE (test-only simulation)
Selected provider: ANIMEGO_CVH
Fallback used: YES
CVH relay: PASS
Translation requested: AniDUB
Translation selected: Dream Cast
Match strategy/confidence: default / 0
Translation changed: YES
Episode preserved: PASS (episode 1)
Resolve latency: 65 ms warm; 4794 ms cold with production English/Romaji identity
Startup latency: 3281 ms
Progression: PASS (0.5 -> 10.53 s)
Seek: PASS (10.53 -> 52.36 s)
Real freezes: NO
Waiting: 2
Stalled: 0
Largest frame gap after playback start: 153 ms
Fatal/non-fatal HLS errors: 0 / 0
```

Simulation query parameters are ignored unless the local server is explicitly
started with `PLAYBACK_DEBUG_SIMULATION=1`.

## Double failure

```text
HTTP status: 503
Error code: PLAYBACK_UNAVAILABLE
Normalized error: PASS
Infinite retry: NO
```

```text
PROVIDER MANAGER READY FOR PRODUCTION: YES
```
