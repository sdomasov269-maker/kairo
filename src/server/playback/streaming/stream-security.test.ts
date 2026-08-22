import assert from "node:assert/strict";
import test from "node:test";
import { fetchUpstream } from "./stream-http.ts";
import { StreamSecurityError, validateUpstreamUrl } from "./stream-security.ts";

const publicDns = async () => [{ address: "93.184.216.34", family: 4 }] as const;

for (const url of [
  "file:///etc/passwd",
  "http://public.example/video.m3u8",
  "https://localhost/video.m3u8",
  "https://127.0.0.1/video.m3u8",
  "https://10.0.0.1/video.m3u8",
  "https://192.168.1.1/video.m3u8",
  "https://169.254.169.254/latest/meta-data",
  "https://[::1]/video.m3u8",
  "https://[fd00::1]/video.m3u8",
]) {
  test(`rejects unsafe upstream ${url}`, async () => {
    await assert.rejects(() => validateUpstreamUrl(url, publicDns), StreamSecurityError);
  });
}

test("rejects hostnames that resolve to private addresses", async () => {
  await assert.rejects(
    () => validateUpstreamUrl("https://public-name.example/video.m3u8", async () => [{ address: "10.1.2.3", family: 4 }]),
    StreamSecurityError,
  );
});

test("accepts HTTPS hostnames resolving only to public addresses", async () => {
  const url = await validateUpstreamUrl("https://cdn.example/video.m3u8", publicDns);
  assert.equal(url.hostname, "cdn.example");
});

test("validates every redirect and rejects a redirect to private IP", async () => {
  let fetches = 0;
  await assert.rejects(
    () => fetchUpstream("https://cdn.example/master.m3u8", {
      headers: new Headers(),
      timeoutMs: 1_000,
      fetchImpl: async () => {
        fetches += 1;
        return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
      },
      validateUrl: (url) => validateUpstreamUrl(url, publicDns),
    }),
    StreamSecurityError,
  );
  assert.equal(fetches, 1);
});
