# Kairo provider research report

Checked: 2026-08-03. This is a read-only discovery pass, not an integration approval.

## Result

The registry contains 23 candidates across anime catalogs, video/embed infrastructure, and localization/distribution services. No candidate currently provides a verified, documented third-party API that combines a current anime catalog, episode metadata, authorized playback, and RU/UK localization. Consequently there is no verified provider for automatic coverage of anime released during 2016–2026.

Generic video services are deliberately not scored as ready anime providers. YouTube, Vimeo, Cloudflare Stream, Mux, Bunny Stream, JW Player, Brightcove, Dailymotion and VK Video provide documented APIs or players, but operate on public videos or assets controlled by an account/content partner. They cannot supply Kairo with a normalized licensed anime catalog by themselves.

## Counts

The deterministic `npm run providers:catalog:report` command calculates the canonical totals from the JSON registry:

- candidates checked: 23;
- documented public APIs: 9;
- official embeds/players: 10;
- partner-access-only candidates: 2;
- ready anime catalogs exposed through a documented integration API: 0;
- anime catalog providers with confirmed RU localization exposed for integration: 0;
- anime catalog providers with confirmed UK localization exposed for integration: 0.

“Confirmed localization” here means discoverable through an authorized integration contract. A language available in a consumer app, or the ability of a video host to accept arbitrary caption files, is not counted.

## Practical ranking

The highest-scored candidates are useful for different, limited reasons:

1. **YouTube (48/100)** — strongest public discovery API plus official iframe player. It is useful only for videos uploaded and made embeddable by rights holders; there is no unified anime catalog or episode contract.
2. **RUTUBE (45/100)** — official public embed instructions and player control documentation, valuable for explicitly embeddable rights-holder videos. No documented anime catalog API was confirmed.
3. **Mux (44/100)** — strongest infrastructure option for Kairo-owned or partner-supplied media, with an official API specification, player, and signed webhooks. It supplies no anime content.

For the next business/technical verification round, contact Crunchyroll (catalog licensing/integration), Tubi (content partner program), and RUTUBE (licensed catalog/partner API terms). These are not adapter recommendations: written authorization and a machine-readable episode/localization contract are still required.

## How access is obtained

- YouTube: create a Google Cloud project, enable YouTube Data API v3, and use an API key or OAuth 2.0 according to the [official API guide](https://developers.google.com/youtube/v3/getting-started).
- Vimeo: register an application/account and obtain OAuth credentials through the [official developer portal](https://developer.vimeo.com/).
- Cloudflare Stream, Mux, Bunny Stream, JW Player and Brightcove: create a commercial/customer account and credentials for content that Kairo or its partner has rights to host.
- Tubi and Pluto TV: use the official content-partnership route; no public catalog/playback API was confirmed.
- Crunchyroll, HIDIVE, ADN, Anime Onegai and RetroCrush: request a direct commercial partnership. Their consumer subscriptions are not API authorization.
- RUTUBE: public embeddable videos can use its documented iframe; catalog-scale or licensed anime use requires confirmation from RUTUBE/rightsholders.

## Evidence highlights

- YouTube documents both its [Data API](https://developers.google.com/youtube/v3) and [iframe player](https://developers.google.com/youtube/iframe_api_reference).
- Vimeo separates its [API and Player SDK](https://developer.vimeo.com/player/sdk).
- Cloudflare documents [Stream](https://developers.cloudflare.com/stream/) and processing [webhooks](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/).
- Mux publishes API/webhook specifications in its [fundamentals](https://www.mux.com/docs/core/mux-fundamentals).
- Bunny documents an AccessKey-protected [Stream API, embed and webhooks](https://docs.bunny.net/api-reference/stream).
- Brightcove’s [Playback API](https://apis.support.brightcove.com/playback/getting-started/overview-playback-api.html) searches a customer Video Cloud library using policy credentials.
- Dailymotion documents its official [player embed](https://developers.dailymotion.com/docs/player-embed-script-web).
- RUTUBE explicitly documents [third-party iframe embedding](https://rutube.ru/info/embed/).

## Low-value and rejected candidates

Collaps and AniParsec have no verified official, authorized integration source and remain unusable. Kodik, Sibnet, Anime365 and MoonAnime have no confirmed public developer contract; unofficial wrappers and reverse-engineered endpoints were excluded. Consumer-only streaming catalogs are also unusable until a provider grants partner access.

## Remaining unknowns

RU/UK audio and subtitle coverage, localization-list endpoints, episode identifiers, update feeds, embed rights, geographic rules, and partner pricing remain `UNKNOWN` for most anime catalogs. Those facts require first-party technical documentation or written partner terms. The raw candidate registry is in `data/media-providers/research/provider-candidates.json`; normalized evidence notes are in `provider-evidence.json` beside it.

## Safety statement

This phase performed zero imports, playback requests, media URL collection, database writes, or credential use. No player, Prisma model, migration, or provider adapter was changed.
