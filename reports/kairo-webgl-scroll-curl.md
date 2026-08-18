# Kairo WebGL scroll curl

## Runtime architecture

- DOM/CSS remains the source of grid layout, card dimensions, links, text, controls, responsive behavior, and accessible images.
- `KairoWebGLEnvironment` mounts Lenis only after client-side WebGL capability detection and owns the fixed R3F canvas.
- R3F's global frame effects call `lenis.raf(time)` before scene `useFrame` subscribers.
- `scrollBus.ts` receives the resulting same-frame Lenis snapshot without React frame-state.
- `DomTargetRectSampler` runs at priority `-3`, the shared curl sampler at `-2`, and image layers at `-1`.

## DOM synchronization

- `AnimePoster` registers only inside an explicit `KairoWebGLSurface` and only after Next Image exposes its real `currentSrc`.
- The registry is mutable and causes React updates only for target registration/removal, not scrolling.
- Cached rectangles are corrected by scroll delta before selective refresh.
- Near-viewport targets are measured accurately; distant targets refresh once every twelve staggered frames.
- Resize invalidates the cache.

## Rendering

- Each active target uses one fullscreen mesh and a shared screen-space curl strength.
- The fragment shader converts screen UV to target-local UV using a normalized DOM rectangle.
- Cover UV math reproduces `object-fit: cover` without stretching.
- A pixel-space rounded-rectangle SDF uses the DOM border radius.
- Curl is calculated from `screenUv.y`; viewport center is nearly unchanged while top and bottom compress more strongly.

## Motion

- Velocity is derived from same-frame scroll-position delta and a clamped frame delta.
- Attack: `0.025s`.
- Release: `0.175s`.
- Maximum curl: `0.072`.
- Reduced motion produces zero curl.

## Fallback

- DOM images remain visible until texture load and a valid cached rectangle are both confirmed.
- Texture failure, unregistration, context loss, reduced-motion startup, or absent WebGL leaves/restores the DOM image.
- Lenis is not mounted when WebGL capability detection fails, preserving native scrolling.

## Coverage

- Home Popular, Continue Watching, and Current Season posters.
- Catalog poster results.
- New Releases poster results.
- Collection mosaics and collection-detail posters.
- Anime Detail related posters.
- Catalog genre tiles through the explicit generic `WebGLImageTarget` wrapper.
