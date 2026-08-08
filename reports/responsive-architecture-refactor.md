# Responsive architecture refactor report

Date: 2026-08-07.

## Initial structure and audit

Styles consisted of `src/app/globals.css` (more than 4,000 lines), `src/styles/tokens.css`, and one feature CSS Module: `src/components/home/EmptyHeroSection.module.css`. Responsive page and component behavior was mostly interleaved with feature rules in `globals.css`; a final unified responsive contract at its end overrode several earlier legacy groups.

Initial breakpoint/query inventory:

- Width maxima: 374, 420, 479, 500, 599, 700, 760, 767, 780, 1023 and 1100px.
- Width minima/ranges: 768, 1024, 1200 (hero module), 1600, 1920 and 2560px.
- Capability queries: hover/pointer and repeated `prefers-reduced-motion` blocks.
- Orientation/height: landscape plus max-height 560px, bounded to max-width 1023px.
- Container queries: no `@container` rules; one `container-type: inline-size` declaration is present as a future candidate.
- Viewport units: `vw`, `vh`, `svh` and `dvh`. Existing geometry was retained.

There is no JavaScript device-layout selection (`innerWidth`, `matchMedia`, `screen.width`, isMobile/isTablet/isDesktop). `OverflowMarqueeText` uses `ResizeObserver` and `clientWidth` to measure actual text overflow; this is component behavior, not breakpoint logic. Responsive image `sizes` strings retain existing 500/600/700/1100px boundaries.

Conflicts/debt found:

- Three separate `max-width: 1100px` groups and multiple 500/780 groups control different feature sets.
- Several reduced-motion blocks are separated in the cascade.
- The final responsive contract intentionally superseded earlier page/header/grid rules, making import order critical.
- Exact duplicate selector heads exist for a small set of feature rules, but declarations are not necessarily duplicates and were not deleted without visual proof.
- Old hero-related comments/rules appear historical, but the approved empty hero is active and no hero code was removed or restored.

## New architecture and moved rules

Created:

- `src/styles/responsive/base.css`
- `src/styles/responsive/mobile.css`
- `src/styles/responsive/tablet-fold.css`
- `src/styles/responsive/desktop.css`
- `docs/responsive-architecture.md`
- this report

`src/app/layout.tsx` now imports the responsive layers after `globals.css`, preserving the previous final-override position. No file was deleted. No component, DOM, content, route, animation, data, auth, API, player or provider behavior changed.

Mechanically moved without changing property values:

- Shared sizing/overflow/container invariants to `base.css`.
- The 767/599/479/374px compact contract to `mobile.css`.
- The 768–1023px contract and bounded compact-landscape watch modifier to `tablet-fold.css`.
- The 1024px home-header and 1600/1920/2560px desktop extensions to `desktop.css`.

Mobile/fold policy is width-based. Tablet/unfolded fold policy is medium inline capacity, not UA. Desktop is available width, never aspect ratio alone. Wide is an extension of desktop. Orientation is only a secondary modifier. Container-query candidates were documented but conversion was deferred.

## Intentionally retained legacy queries

Feature-local queries at 420, 500, 700, 760, 780 and 1100px, reduced-motion blocks, pointer capability behavior, and `EmptyHeroSection.module.css` breakpoints remain in place. They participate in long-standing cascade chains or component-local geometry. Consolidation was **Deferred because it would modify current UI** unless verified by baseline/after screenshots.

No dead CSS or component was deleted: code search alone could not prove visual/runtime non-use for feature flags, auth states and dynamic routes. MobileNavigation and desktop-nav are different presentation surfaces in one header flow; merging them would risk navigation UX and was deferred.

## Visual and route validation

Required screenshot baseline/after capture could not be performed because the Browser runtime exposed no available browser backend in this environment. No unrelated browser automation surface was substituted. Therefore the refactor deliberately migrated only isolated blocks with identical declarations and preserved risky legacy rules. Pixel-level sign-off remains blocked pending screenshots at 320×568, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900 and 1920×1080.

HTTP rendering/smoke coverage includes `/`, `/catalog`, `/new`, `/collections`, a collection detail, anime detail, watch, `/history`, `/my-list`, `/profile`, `/settings`, `/login`, `/register`, not-found and health. Search UI is covered structurally through Header/GlobalSearch and the search API route.

## Remaining architectural debt

- Capture screenshot baselines and diffs, then migrate feature-local legacy groups in small batches.
- Reconcile 760/767/780 and 1023/1100 boundaries only if computed output remains identical.
- Consolidate repeated reduced-motion blocks after cascade verification.
- Audit legacy `100vh` menus against mobile browser chrome without changing current geometry prematurely.
- Evaluate anime/collection/profile cards for container queries with dedicated regression tests.
- Introduce automated visual regression coverage before deleting suspected old hero CSS.

## Final validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 143/143.
- `npm run build`: Next.js 16.3.0 loaded all four new stylesheets and completed production compilation successfully in 2.4 seconds. The restricted Windows environment then rejected a Next.js child process with `spawn EPERM` during the TypeScript stage. No CSS parsing, missing-module or application compilation error was reported, but a complete production artifact was not emitted; production build sign-off remains blocked outside this sandbox.
- HTTP route QA: 200 for `/`, `/catalog`, `/new`, `/collections`, collection detail, anime detail, watch, history, list, profile (following auth redirect), settings, login, register and search API; the unknown route returned 404 as expected.
- Browser console/hydration and screenshot comparison: not available because the Browser runtime returned no browser backend. No hydration-affecting JavaScript or DOM was introduced by this refactor.

No files were deleted. The working tree already contained unrelated/previous-task changes in `next-env.d.ts`, UI account pages, `globals.css`, `tokens.css` and the prior UI audit; they were preserved. The files substantially changed by this responsive task are `src/app/layout.tsx`, the mechanically reduced responsive section of `src/app/globals.css`, the four new responsive stylesheets, `docs/responsive-architecture.md`, and this report.
