# Kairo UI design-system audit

Audit date: 2026-08-07. Stack verified during the audit: Next.js 16.3.0, App Router, React and TypeScript.

## Scope and routes

The UI architecture, route markup, shared components, state components and global CSS were inspected for `/`, `/catalog`, `/new`, `/collections`, `/collections/[slug]`, `/anime/[slug]`, `/watch/[slug]/[episode]`, `/history`, `/my-list`, `/profile`, `/settings`, `/login`, `/register`, and the global not-found route. Catalog, collections, new, anime and watch loading/error/not-found implementations were also inspected. Header, desktop/mobile navigation, global search, account menu, language selector, dialogs, settings controls, cards, filters, pagination, episode navigation and player layout were included.

Local HTTP QA returned 200 for every required concrete route (profile redirects were followed), 404 for an unknown route, and 200 for `/api/health`.

## Findings

- The project already had useful shared primitives (`AppShell`, `PageContainer`, `PageHero`, `SectionHeading`, state components) and mature discovery/anime/watch CSS, but account pages did not consistently use them.
- `/history` and `/my-list` reused the auth card as a generic content card, mixed bare controls with page layout and lacked stable list/tabs/empty-state geometry.
- `/profile` was constrained to an authentication-sized card and did not provide a responsive identity/stats/details grid.
- Root CSS redefined radius and card-gap variables already owned by `tokens.css`, making the token source non-authoritative.
- Auth errors were conditionally inserted, producing avoidable vertical layout shift.
- A full-viewport `100vw` pseudo-element on anime detail could contribute to horizontal overflow when a vertical scrollbar is present.
- Legacy CSS contains historical sections and some component-specific pixel values. Many are deliberate player overlays, poster badges, decorative backgrounds or bounded menus; those were retained to avoid changing approved hero/player behavior.

## System changes

- `tokens.css` is authoritative for radii/card gaps. Added page-title, section-title, card-title, line-height and control-height tokens.
- The global page-title contract now uses a shared responsive type token and consistent tight leading.
- Stable `scrollbar-gutter` prevents route-width shifts on supporting browsers.
- History, list and profile now share the existing page container/hero geometry and a new account-surface contract.
- My List has a horizontally stable, scrollable status tab bar with fixed control height and counters for all supported states.
- Account search, destructive actions, selects and cards use the shared button/form surface rules and 44px-or-larger touch geometry.
- History has bounded title handling, consistent progress geometry, responsive actions and a stable two-column/one-column grid.
- Profile has an identity area, stable stats, account details, long-email wrapping and tablet/mobile reflow.
- History and list use the shared `EmptyState` rather than isolated text.
- Auth error space is reserved with `aria-live`, removing form shift when validation fails.
- The anime-detail decorative background no longer uses `100vw`, eliminating the audited viewport overflow source.

## Shared components and primitives

Reused or extended: `AppShell`, `PageContainer`, `PageHero`, `EmptyState`, global `.button` variants, global form controls, `SettingsSection`, `SettingsRow`, `SettingsSwitch`, `AnimeCard`, `ContinueWatchingCard`, discovery page shells and states. No business/API/auth/Prisma/provider contracts were changed.

Typography levels are now expressed through `--text-page-title`, `--text-section-title`, `--text-card-title`, existing `--text-xs` through `--text-6xl`, `--leading-tight`, and `--leading-body`. Controls use `--control-height-sm/md/lg`. Spacing remains on the existing 4px-based `--space-*` scale.

## Responsive and overflow QA

CSS behavior was audited against the requested viewport classes: 1920, 1440, 1280, 1024, 768, 430, 390 and 375 pixels. Explicit contracts cover wide desktop (1600/1920), desktop, tablet (768–1023), mobile (<768), compact mobile (<600/<480) and narrow mobile (<375). Account grids collapse at 1023px; toolbars, identity and action groups reflow below 600px. Card/grid children use `minmax(0, 1fr)` and account text uses `min-width: 0`, ellipsis or `overflow-wrap` as appropriate.

Remaining horizontal overflow declarations are local scroll containers (tabs/navigation), not global hiding. Player navigation keeps local `overflow-x: hidden` because it is a bounded vertical episode scroller. Absolute/fixed positioning retained is for header, dialogs, dropdowns, player prompts/controls, poster overlays and decorative layers.

The Browser plugin exposed no available browser backend in this session, so screenshot-based pixel review at the eight exact widths could not be performed. This is a QA environment limitation; static responsive inspection and live HTTP route rendering were completed. A final human/browser screenshot pass remains recommended before release.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with no new warnings/errors.
- `npm test`: passed, 143/143.
- `npm run build`: Next.js production compilation completed successfully and its TypeScript phase started/completed without an application error; Windows then rejected a Next.js child process with `spawn EPERM`. A final production artifact was not emitted in this sandbox. This is an unresolved environment blocker, so the audit does not claim a fully passing production build.

## Remaining legacy/risk items

- `globals.css` is large and contains historical component-scoped rules. A future low-risk cleanup can split it by feature after screenshot regression coverage exists; doing that without visual tooling would add unnecessary risk.
- Account status labels currently use the existing stored enum strings. Localizing those labels should be done through the established dictionary pipeline in a separate localization change.
- Authenticated profile contents were HTTP-tested through redirect behavior, but a signed-in visual session was unavailable.
- Run the final build outside the restricted Windows sandbox and complete screenshot comparison at all requested widths before production sign-off.

## Significantly changed files

- `src/styles/tokens.css`
- `src/app/globals.css`
- `src/app/history/page.tsx`
- `src/app/my-list/page.tsx`
- `src/components/auth/ProfileContent.tsx`
- `src/components/auth/AuthForm.tsx`
- `reports/ui-design-system-audit.md`
