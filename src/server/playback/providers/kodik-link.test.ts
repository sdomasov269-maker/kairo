import assert from "node:assert/strict";
import test from "node:test";
import { VideoLinks } from "kodikwrapper";
import { canonicalizeKodikPlayerLink } from "./kodik-link.ts";
import { createDiagnosticFetcher } from "./kodik-video-info-fetcher.ts";

for (const input of [
  "//aniqit.com/seria/1641709/hash/720p?translations=true",
  "http://aniqit.com/seria/1641709/hash/720p?translations=true",
  "https://aniqit.com/seria/1641709/hash/720p?translations=true",
  "https://kodikplayer.com/seria/1641709/hash/720p?translations=true",
])
  test(`canonicalizes ${input}`, () =>
    assert.equal(
      canonicalizeKodikPlayerLink(input),
      "https://kodikplayer.com/seria/1641709/hash/720p?translations=true",
    ));

test("converts the video-info query into a form POST and safely previews HTML", async () => {
  const originalDebug = process.env.KAIRO_PLAYBACK_DEBUG;
  const originalInfo = console.info;
  const logs: unknown[][] = [];
  let request: { url: URL; init?: RequestInit } | undefined;
  process.env.KAIRO_PLAYBACK_DEBUG = "true";
  console.info = (...args: unknown[]) => logs.push(args);

  try {
    const fetcher = createDiagnosticFetcher({
      canonicalPlayerUrl: "https://kodikplayer.com/seria/1641709/hash/720p?translations=true",
      videoInfoEndpoint: "/ftor",
      fetchImpl: async (url, init) => {
        request = { url: new URL(url.toString()), init };
        return new Response("<!DOCTYPE html><title>challenge</title>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    });

    await assert.rejects(
      VideoLinks.getLinks({
        link: "https://kodikplayer.com/seria/1641709/hash/720p?translations=true",
        videoInfoEndpoint: "/ftor",
        fetcher,
      }),
      (error: unknown) =>
        Boolean(
          error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "get-links-invalid-response",
        ),
    );

    assert.equal(request?.url.href, "https://kodikplayer.com/ftor");
    assert.equal(request?.init?.method, "POST");
    assert.equal(request?.init?.body, "hash=hash&id=1641709&type=seria");
    const headers = new Headers(request?.init?.headers);
    assert.equal(headers.get("content-type"), "application/x-www-form-urlencoded; charset=UTF-8");
    assert.equal(headers.get("x-requested-with"), "XMLHttpRequest");
    assert.ok(logs.some(([, detail]) =>
      typeof detail === "object" &&
      detail !== null &&
      "responsePreview" in detail &&
      detail.responsePreview === "<!DOCTYPE html><title>challenge</title>",
    ));
  } finally {
    console.info = originalInfo;
    if (originalDebug === undefined) delete process.env.KAIRO_PLAYBACK_DEBUG;
    else process.env.KAIRO_PLAYBACK_DEBUG = originalDebug;
  }
});
