# Kodik Player bridge

Source: Kodik Player API. The integration uses `window.postMessage` and remains
isolated from the Kairo watch UI.

- Incoming messages use the `kodik_player_*` event keys.
- Outgoing commands have the shape
  `{ key: "kodik_player_api", value: { method: "..." } }`.
- Incoming messages are accepted only from the mounted iframe window and the
  exact HTTPS origin derived from its `src`.
- `KodikPlayer` performs no API requests and never receives or stores a Kodik
  API token.

The bridge is intentionally not connected to `WatchPageContent` or the current
watch-progress persistence yet.
