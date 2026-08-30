<!-- BEGIN:nextjs-agent-rules -->

## Kairo Codex Instructions

## Code search policy

Before reading repository files directly:

1. Use `code-search.search` first.
2. Search by exact symbol when the identifier is known.
3. Use semantic queries when locating behavior or responsibility.
4. Read only the files returned by code-search.
5. Use grep/ripgrep only when semantic search is insufficient or an exact string search is required.
6. Never recursively scan the whole repository unless explicitly necessary.

Before creating any new component, hook, service, utility, provider, API route, or abstraction:

- search for an existing equivalent first.

## Documentation

Use Context7 for external library documentation, especially:

- Next.js
- React
- Prisma
- Three.js
- React Three Fiber
- Shaka Player
- hls.js
- Playwright

Do not guess library APIs when documentation is available.

## UI verification

After changes affecting UI, routing, player behavior, or interactions:

1. Run the application.
2. Verify the affected flow with Playwright.
3. Check console errors.
4. Test navigation and interactive states.
5. Fix regressions before considering the task complete.

## Architecture

Do not create duplicate implementations.

Before introducing a new:

- component
- hook
- service
- utility
- provider
- API route
- playback abstraction

search the existing codebase first.

Prefer modifying the existing architecture over creating parallel systems.

## Kairo playback

Useful search concepts include:

- KairoPlayer
- PlaybackDescriptor
- AnimePlaybackPanel
- translation selector
- episode switching
- playback provider

<!-- END:nextjs-agent-rules -->
