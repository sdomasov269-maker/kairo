# Kairo depth-scroll audit

## Card components

- `AnimeCard`: shared poster card used by catalog, new releases, collections, search, related content, and Home current-season/popular grids.
- `ContinueWatchingCard`: shared landscape progress card; Home also has a separate CSS-module implementation.
- Catalog `.category-tile`: representative wide artwork tile and the selected prototype surface.
- Collections `.system-collection-card`: collection mosaic tile.
- Home CSS-module surfaces: popular/continue-watching/upcoming rows and empty or loading states.
- Account `.account-item-card`: list and history card shells.
- Detail/watch surfaces include episode and related-content cards, but player and comments/form panels are not eligible.

## Migrated surfaces

- Home popular and current-season poster grids.
- Home continue-watching visual cards.
- Catalog genre tiles and paginated anime results.
- New Releases anime results.
- Collections overview tiles and collection-detail anime grids.
- Anime detail related-title grid.

Account history/list action panels, loading skeletons, calendar/upcoming rows, modal content, player, comments, navigation, forms, and fixed backgrounds remain excluded.

## Current hover transforms

- `AnimeCard` uses Motion `whileHover` for vertical lift; its poster image separately scales in CSS.
- Catalog genre tiles use CSS `translateY(-3px)` plus artwork scale.
- Collection cards and Home continue-watching cards use CSS vertical lift.
- These transforms cannot safely coexist with a depth transform unless composed through shared variables or separated across wrapper layers.

## Current motion system

- Global duration/easing tokens exist in `globals.css` and `tokens.css`.
- Motion is used for page/reveal/hover interactions, but there is no shared scroll-position coordinator.
- The global background is already fixed and remains outside the eligible content-card system.

## Scroll performance risks

- A listener or Motion value per card would scale poorly at 72–100+ items.
- Unfiltered `getBoundingClientRect()` calls would cause excessive work.
- Home load-more and client navigation introduce cards dynamically.
- Dynamic blur and large changing shadows are unsuitable for dense poster grids.

## Superseded DOM prototype

- The former `DepthScrollCoordinator` and `KairoDepthSurface` implementation has been removed after migration to the fixed WebGL image pipeline.
- `IntersectionObserver` filters complete `[data-depth-field]` grids near the viewport.
- Responsive rows are detected from rendered geometry without hardcoded column counts.
- One representative element is measured per row; all cards in that row receive identical geometry.
- A continuous cosine bend makes every row sample the same flexible surface; its slope supplies coherent rotation while signed smoothed velocity reverses the whole warp.
- Geometry reads are batched before CSS-property writes, and all rows share one global intensity and return phase.
- `KairoDepthSurface` registers one logical section and wraps visual items outside their existing card roots.
- `KairoDepthItem` supports mixed-state grids where only eligible visual children should participate.
- The `compact`, `poster`, and `landscape` presets share one curve and differ only by amplitude.
- CSS variables compose depth with existing hover motion instead of overwriting transforms.
- `MutationObserver` discovers route-transition and load-more content without reloads.
- SSR and idle states stay exactly neutral; the scroll-only effect starts after client measurement and returns to literal neutral values.
- Reduced motion disables the coordinator; coarse pointers receive 50% intensity.

## WebGL replacement

- Scroll state and manual Lenis bridge live under `src/components/webgl/scroll`.
- DOM registration and staggered rect caching live under `src/components/webgl/dom-sync`.
- Texture layers, cover/radius math, and screen-space curl live under `src/components/webgl/images`.
- `KairoWebGLEnvironment` owns the fixed canvas and wraps the scrolling application.
- `KairoWebGLSurface` explicitly opts eligible poster grids into registration.

## Shared danger zone

- Do not mark headers, controls other than visual tiles, modals, player, form panels, text blocks, skeletons, or fixed background layers.
- Poster rollout must first replace the Motion-owned article transform with the same composable variable contract.
- Avoid stacking `filter` on cards whose descendants already use expensive filters.
- Keep focus outlines outside transformed clipping contexts and preserve DOM/tab order.
