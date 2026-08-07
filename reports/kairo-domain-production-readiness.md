# Kairo domain production readiness

Audit date: 2026-08-07. Canonical target: `https://kairo-anime.com`.

## Findings and changes

- `src/app/layout.tsx` hardcoded `http://localhost:3000` as `metadataBase`; this was replaced by the central site URL helper.
- No central site-origin configuration, robots metadata, sitemap, health endpoint, production env template, environment validation, or deployment runbook existed. They were added.
- Root and anime canonicals now resolve absolutely through the canonical metadata base. Root OpenGraph also declares `/`.
- The application now redirects only the exact `www.kairo-anime.com` host to the HTTPS apex. Localhost is unaffected.
- Existing global headers already provided `nosniff`, strict-origin referrer policy, SAMEORIGIN framing, and a restrictive permissions policy. No broad CORS header or wildcard image domain was found. No speculative CSP was added because the current React/Next.js runtime and media integrations require deployment-specific testing first.
- NextAuth uses its built-in cookie policy, has no forced cookie domain, validates redirect origins, and reads `NEXTAUTH_SECRET` with the existing `AUTH_SECRET` compatibility fallback.
- Prisma targets PostgreSQL and has seven ordered migrations. No migration was executed and the local `DATABASE_URL` was not changed.
- Kodik playback remains disabled. No token was added or copied.

## Remaining localhost references

Allowed references remain in `.env.example` (development URLs/database), `src/lib/site-url.ts` (development fallback), `src/domain/watch/media-url.ts` (explicit local-media development validation), and tests/documentation. Production site URL generation does not depend on localhost.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 143/143.
- `npm run build`: application compilation and Next.js TypeScript phase passed; the build then stopped at `spawn EPERM` while Next.js attempted a child process in the Windows sandbox. This is an environment blocker, so a complete production artifact was not produced here.
- Local development HTTP smoke test: not completed because no server was listening on port 3000 and sandbox policy rejected starting the background development process. Static type/lint/test verification passed.

## Production environment

Required: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` (or legacy `AUTH_SECRET`). Keep both public/auth URLs at `https://kairo-anime.com`. Provider tokens become required only when their provider is enabled. Keep `KODIK_PROVIDER_ENABLED=false` and `KODIK_PLAYBACK_ENABLED=false` pending approval.

## Blockers and owner actions

The domain must not yet be considered live based on this audit. The owner must provision hosting and a separate production PostgreSQL database, store production secrets, run `npx prisma migrate deploy` against the verified production database, obtain a successful build outside this sandbox, configure Cloudflare DNS manually, attach apex and `www` custom domains, enable strict HTTPS, configure any OAuth callback, and perform the documented smoke tests. A production-tested CSP may be introduced afterward; do not deploy an untested strict policy.

Deployment procedure: `docs/deployment-kairo-anime-com.md`.
