# Provider-independent translation matching acceptance

Date: 2026-08-25  
Browser: headed Chrome 151  
Title: Shikimori `56735`, AnimeGO `3591`, episode `1`

## Live translation evidence

Kodik requested `AniDUB (8 эп.)`. CVH exposed Dream Cast (coverage 7),
AniLiberty (7), SHIZA Project (7), and AnimeVost (8). All contained episode 1;
CVH had no AniDUB equivalent. AnimeVost, AniLiberty, and SHIZA were tried in
deterministic preference order but their live CVH stream resolution was
rejected. Dream Cast was the first playable deterministic candidate.

```text
Requested translation: AniDUB
Selected CVH translation: Dream Cast
Strategy: default
Confidence: 0
Changed: true
Episode preserved: 1
```

## Browser playback

```text
Forced fallback resolve latency: 5992 ms
Startup latency: 601 ms
Progression: 10.55 s
After +35 s seek: 52.36 s
Waiting: 1
Stalled: 0
Largest frame gap: 187.7 ms
Fatal/non-fatal HLS errors: 0 / 0
```

```text
Translation normalization: PASS
Exact matching: PASS
Alias matching: PASS
Fuzzy threshold: PASS
Episode-aware matching: PASS
Deterministic default: PASS

Forced fallback playback: PASS
Episode preserved: PASS
Translation diagnostics: PASS
```
