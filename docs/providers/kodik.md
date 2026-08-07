# Kodik provider

Status: `OPT_IN_SERVER_EMBED` for the watch resolver; registry adapter remains `PARTNER_ACCESS_REQUIRED` until its wider metadata contract is verified.

Kairo has an isolated server-side integration for the explicitly configured `https://kodikapi.com/search` endpoint. It is inert unless `KODIK_PROVIDER_ENABLED`, `KODIK_PLAYBACK_ENABLED`, `KODIK_API_TOKEN`, and `KODIK_ALLOWED_EMBED_HOSTS` are all configured. The token is trimmed, used only by the server request, removed from diagnostic URLs, and never returned to a client component.

The integration searches by the existing MAL identifier using the confirmed `shikimori_id` request parameter, performs one availability lookup on an Anime detail page, and resolves one exact season/episode on a watch page. Only an HTTPS embed URL on the explicit host allowlist is returned. It never extracts HLS/DASH/MP4, iframe HTML, cookies, signatures, or DRM data. `COMING_SOON` remains authoritative; provider failures fall back to `NO_VIDEO`.

Diagnostics distinguish `NOT_FOUND`, authentication/authorization failures, rate limiting, timeout, network/DNS failure, unexpected content type, invalid JSON, schema mismatch, and oversized responses. Only timeout, network failure, HTTP 429, and HTTP 5xx receive bounded retries. Empty results and authorization failures are never replaced with mock releases.

The generic provider-registry adapter remains disabled and its broader capabilities remain `UNKNOWN`. The watch integration does not write provider data to PostgreSQL and does not enable the sync/update commands.

To complete the integration, Kairo needs all of the following from Kodik:

- official documentation URL and API base URL;
- API token and explicit API usage permission;
- external embed/playback permission and the allowed Kairo domain;
- rate limits and authentication rules;
- documented search, title, episode, playback/embed, and update endpoints;
- caching, temporary URL, hostname, and geographic restriction rules.

Only after those are supplied may the project save a sanitized contract snapshot, implement Zod response schemas, and enable metadata synchronization. Playback additionally requires verified written permission and strict embed/media host allowlists. Iframe HTML and direct media extracted from an iframe are never accepted.

Commands:

```powershell
npm run providers:kodik:inspect
npm run providers:kodik:health
npm run providers:kodik:diagnose -- --anilist-id=16498 --season=1 --episode=1 --json
npm run providers:kodik:search -- --query="..."
npm run providers:kodik:show -- --id=<id>
npm run providers:kodik:sync -- --id=<id> --dry-run
npm run providers:kodik:updates -- --dry-run
```

`--apply` remains a controlled no-op until the official contract is implemented. No Kodik-specific Prisma models or admin import route exist.
