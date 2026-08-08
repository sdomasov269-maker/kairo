# Kairo responsive architecture

This document is the source of truth for responsive work in Kairo. The current refactor separates architecture from future design work: rules were moved without intentionally changing computed values, layout, content, interaction or DOM order.

> Breakpoints represent layout capacity, not physical device identity.

## Cascade and file ownership

Root layout loads styles in this order:

1. `src/app/globals.css` — feature and component styles, including retained cascade-sensitive legacy queries.
2. `src/styles/responsive/base.css` — viewport-independent layout invariants shared by every capacity.
3. `src/styles/responsive/mobile.css` — compact-capacity overrides.
4. `src/styles/responsive/tablet-fold.css` — medium-capacity overrides and compact-height/orientation modifiers.
5. `src/styles/responsive/desktop.css` — desktop and wide desktop extensions.

`src/styles/tokens.css` remains the visual-token source of truth. Do not duplicate colors, typography, spacing or radius scales in device files. CSS custom properties cannot be used as ordinary media-query boundaries, so numeric boundaries are documented here and written literally in CSS. Do not add a second TypeScript breakpoint map unless JavaScript behavior genuinely requires it.

## Capacity policy

The target architecture is compact/mobile at roughly 320–639px, tablet/fold at roughly 640–1199px, desktop at 1200px and above, with wide desktop as a desktop extension from roughly 1920px. During migration, existing boundaries take precedence whenever changing them could alter the current UI.

The currently migrated contract therefore preserves the proven legacy thresholds:

- Compact: `max-width: 767px`, with refinements at 599px, 479px and 374px.
- Medium/tablet: `768px–1023px`.
- Desktop home-header extension: `min-width: 1024px`.
- Wide desktop: 1600px, 1920px and 2560px extensions.

Older feature-local thresholds at 420, 500, 700, 760, 780 and 1100px remain in `globals.css`. They must not be normalized until screenshot regression tests demonstrate equivalent output. Future work may converge them toward 640/1200 capacity boundaries as a separate design/migration task.

## Mobile and folded phones

`mobile.css` owns the migrated compact header/navigation geometry, compact page/card grids, dialogs/filter panel, page hero, anime-detail actions and watch/player width. Folded devices enter this mode naturally through available inline width. Never use brand names or user-agent detection.

## Tablet and unfolded foldables

`tablet-fold.css` owns the migrated 768–1023px grid, navigation and watch-information layout. An unfolded foldable is simply a medium-width container. No reload or device detection is required when the viewport changes.

## Desktop and wide desktop

`desktop.css` owns the migrated desktop home-header grid and extensions at 1600, 1920 and 2560px. Wide is a desktop sub-mode, not a separate device identity. Aspect ratio alone must never select desktop.

## Orientation and viewport height

Inline capacity is the primary category. Orientation and height are secondary modifiers only. The existing compact-landscape watch rule remains bounded by `max-width: 1023px` and `max-height: 560px`; it does not classify a landscape phone as desktop.

Existing `svh`/`dvh` usage is retained. A small number of legacy `vh` uses remain because changing them could alter approved geometry; audit them only with before/after screenshots.

## Media queries, container queries and JavaScript

Use a viewport media query for page-level composition, global navigation and capacity-wide grid behavior. Keep a query next to a component when it controls only that component and moving it provides no clear architectural benefit.

Prefer a container query only when a reusable component truly depends on its allocated container rather than the viewport and pixel-equivalent behavior can be proven. Current candidates include anime cards, collection cards and profile/account surfaces. Do not mass-convert them without regression coverage.

JavaScript must not choose ordinary responsive layout. Never read `window.innerWidth`, `screen.width` or similar during render, and never add mounted gates for CSS layout. JavaScript is allowed for genuinely behavioral capabilities (for example a costly rendering feature) or measuring content that CSS cannot express. The current `ResizeObserver` in `OverflowMarqueeText` measures overflow behavior; it is not a device breakpoint and remains valid.

## Naming and adding a breakpoint

- Name files and concepts by capacity (`mobile`, `tablet-fold`, `desktop`), never by vendor/device.
- Add a rule to an existing boundary whenever possible.
- Document the layout transition the boundary represents.
- Keep component visuals in component/feature styles; capacity files contain high-level responsive overrides only.
- Do not use `!important` to compensate for incorrect import order or specificity.
- Preserve semantic DOM order, tab order, ARIA and focus flow.
- Before adding a new boundary, search all CSS plus `matchMedia`, width APIs and image `sizes` strings.
- Capture baseline and after screenshots at 390×844, 768×1024 and 1440×900 at minimum, then run the extended matrix where the affected feature warrants it.

## Migration rule

If moving or consolidating a rule cannot be proven visually identical, leave it feature-local and record: **Deferred because it would modify current UI.** Architectural tidiness is never a reason to risk the approved UI.
