import assert from "node:assert/strict";
import test from "node:test";
import { chooseHlsPlaybackMode, isSafariBrowser } from "./hls-policy.ts";

test("Safari keeps native HLS when both transports exist", () => {
  assert.equal(
    chooseHlsPlaybackMode({ nativeHls: true, mseHls: true, safari: true }),
    "native",
  );
});

test("Chromium prefers hls.js MSE over its native HLS pipeline", () => {
  assert.equal(
    chooseHlsPlaybackMode({ nativeHls: true, mseHls: true, safari: false }),
    "mse",
  );
});

test("native HLS remains the fallback without MSE", () => {
  assert.equal(
    chooseHlsPlaybackMode({ nativeHls: true, mseHls: false, safari: false }),
    "native",
  );
  assert.equal(
    chooseHlsPlaybackMode({ nativeHls: false, mseHls: false, safari: false }),
    null,
  );
});

test("Safari detection excludes Chrome and Edge on Apple platforms", () => {
  assert.equal(
    isSafariBrowser({
      vendor: "Apple Computer, Inc.",
      userAgent:
        "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    }),
    true,
  );
  assert.equal(
    isSafariBrowser({
      vendor: "Apple Computer, Inc.",
      userAgent:
        "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/151.0 Mobile/15E148 Safari/604.1",
    }),
    false,
  );
  assert.equal(
    isSafariBrowser({
      vendor: "Google Inc.",
      userAgent:
        "Mozilla/5.0 AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",
    }),
    false,
  );
});
