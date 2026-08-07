# Kairo production deployment

The canonical production origin is `https://kairo-anime.com`. The `www` host is secondary and the application redirects it to the apex host while preserving path and query string.

## Runtime and database

Use Node.js 20.9 or newer and a dedicated, backed-up production PostgreSQL database. Never point production at the localhost database. Copy `.env.production.example` into the hosting provider's secret/configuration store and fill the placeholders; do not commit the resulting values.

Required values are `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=https://kairo-anime.com`, `NEXTAUTH_URL=https://kairo-anime.com`, and a strong `NEXTAUTH_SECRET`. Provider credentials are required only when their provider flag is explicitly enabled. Keep `KODIK_PROVIDER_ENABLED=false` and `KODIK_PLAYBACK_ENABLED=false` until partner approval and a private production token are available.

Before releasing application code, run the non-destructive production migration command against the verified production connection:

```powershell
npx prisma migrate deploy
npm run build
npm run start
```

Do not run `prisma migrate reset` in production. The current repository contains ordered migrations under `prisma/migrations` and uses PostgreSQL.

## Cloudflare and HTTPS

DNS changes are manual owner actions. Point the apex record to the selected production platform only after that platform supplies its exact target. Add `www` to the same deployment so TLS covers it, then point the `www` DNS record as instructed by the platform. Do not create a second competing redirect at Cloudflare unless it is tested to avoid a loop with the application redirect.

Use Cloudflare SSL/TLS mode **Full (strict)** with a valid origin/platform certificate. Preserve `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` through any reverse proxy. Validate both DNS records and certificates before enabling proxying. Confirm that HTTP redirects to HTTPS and that no generated production link uses HTTP.

## Vercel option

Import the repository, use the detected Next.js preset, add the production variables from `.env.production.example`, and connect `kairo-anime.com` plus `www.kairo-anime.com` in the Vercel project. Copy the DNS targets Vercel displays into Cloudflare manually. Set the apex as the primary domain. Vercel's build command may remain `npm run build`; its start command is platform-managed.

## NextAuth and validation

Set the OAuth provider callback, when Google OAuth is enabled, to `https://kairo-anime.com/api/auth/callback/google`. Set `NEXTAUTH_URL` exactly to the canonical HTTPS origin. Kairo does not force a cookie domain, so secure production cookies and localhost development remain isolated. Test sign-in, session refresh, sign-out, rejected external callback URLs, and CSRF protection.

## Post-deploy smoke test

Check `/`, `/catalog`, a known `/anime/...` page, a `/watch/...` page, `/login`, sign-in/sign-out, `/api/auth/session`, `/api/search`, `/robots.txt`, `/sitemap.xml`, and `/api/health`. The health response must be `{"status":"ok","service":"kairo"}` and expose no configuration. Verify canonical/OpenGraph URLs in rendered HTML, security headers, images, and that `https://www.kairo-anime.com/path?x=1` redirects once to `https://kairo-anime.com/path?x=1`.

## Rollback

Keep the prior immutable deployment available. If smoke tests fail, route traffic back to it using the hosting platform's rollback feature; do not reverse already-applied database migrations blindly. Restore the database from a verified backup only when the release changed data incompatibly. Retain logs, identify whether the fault is code, environment, DNS, TLS, or migration state, fix forward, and repeat the smoke test before restoring traffic.
