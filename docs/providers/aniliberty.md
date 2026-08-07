# AniLiberty provider

The adapter uses AniLiberty API V1 OpenAPI 3.0.0, version 1.0.0. The declared primary server is `https://aniliberty.top/api/v1`. The sanitized development snapshot is stored at `data/media-providers/aniliberty/openapi.snapshot.json`.

Implemented metadata endpoints from the official schema:

- `GET /app/search/releases`;
- `GET /anime/releases/{idOrAlias}` with an explicit include list for release and episode metadata;
- `GET /anime/schedule/week`;
- `GET /app/status` for health.

The schema globally declares bearer `sessionToken` authentication. Public metadata calls currently work without a token, so Authorization is omitted when `ANILIBERTY_API_TOKEN` is empty. The schema does not declare rate-limit values. The client observes `Retry-After` on 429 and retries only timeout, 429, and 5xx responses.

Release responses contain numeric ID, names, year, type, alias, description, episode count/status/update fields, and optionally episodes. Episode metadata contains UUID, ordinal/sort order, names, duration, preview structure, update time and availability indicators. Only quality labels are retained; HLS fields and external player IDs are not persisted or printed.

OpenAPI describes `GET /media/videos` returning video content fields `id`, `url`, `title`, `views`, `image`, `comments`, `video_id`, timestamps and announcement state, plus origin metadata. This endpoint was not called, and URLs were neither collected nor saved.

Playback status is `PARTNER_PERMISSION_REQUIRED`. Direct media and iframe capabilities are false even though episode responses expose playback-related fields. Enabling the environment flag alone cannot enable playback.

Matching uses exact original title + year + format, then exact Russian title + year + format. The current public response does not expose AniList/MAL IDs. Ambiguous/fuzzy results require manual review.

Search transport validation is intentionally separate from the normalized Kairo model. The live response is a top-level array; `type.value`, `type.description`, `season.value`, `season.description`, `notification`, `episodes_total`, `external_player`, and alternative titles may be null. Each item is validated independently, numeric/string IDs normalize to strings, and a malformed item is rejected without discarding valid siblings. The current sanitized fixture is `src/server/media-providers/adapters/aniliberty/fixtures/search-current.json`.

CLI:

```powershell
npm run providers:aniliberty:inspect
npm run providers:aniliberty:search -- --query="Врата Штейна"
npm run providers:aniliberty:show -- --id=8674
npm run providers:aniliberty:sync -- --id=8674 --dry-run
npm run providers:aniliberty:updates -- --dry-run
```

Apply uses one Prisma transaction and only the existing provider, season, episode and reference models. It never writes `AnimeVideoSource`, subtitles, localization, slugs, manual metadata, or `WatchProgress`.
