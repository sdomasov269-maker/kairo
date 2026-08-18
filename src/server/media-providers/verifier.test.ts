import assert from "node:assert/strict";
import test from "node:test";
import {
  createProbeTransport,
  isPrivateAddress,
  MAX_PROBE_BYTES,
  type ProbeTransport,
} from "./probe-transport.ts";
import { verifyProviderCandidate } from "./verifier.ts";
import type {
  ProbeResponseEvidence,
  ProviderCandidateConfig,
} from "./verification-types.ts";

const candidate: ProviderCandidateConfig = {
  key: "test",
  name: "Test",
  baseUrl: "https://api.example.com",
  documentationUrl: "https://api.example.com/docs",
  defaultStatus: "UNVERIFIED",
  declaredPaths: ["/anime/search", "/episode/{id}/player"],
};
function mockTransport(
  responses: Array<{ status?: number; type?: string; body?: string } | Error>,
): ProbeTransport {
  let requests = 0;
  return {
    get requests() {
      return requests;
    },
    dnsAddresses: ["203.0.113.10"],
    inspectTls: async () => ({ authorized: true, protocol: "TLSv1.3" }),
    request: async (url) => {
      const response =
        responses[requests++] ?? new Error("request budget exhausted");
      if (response instanceof Error) throw response;
      return {
        evidence: {
          url,
          status: response.status ?? 200,
          contentType: response.type ?? "application/json",
          headers: {},
          bytes: (response.body ?? "").length,
          redirects: [],
        } satisfies ProbeResponseEvidence,
        body: response.body ?? "",
      };
    },
  };
}
test("valid OpenAPI and API-key auth are detected", async () => {
  const schema = JSON.stringify({
    openapi: "3.1.0",
    info: { title: "Official API", version: "1" },
    components: {
      securitySchemes: { ApiKey: { type: "apiKey", name: "X-API-Key" } },
    },
    paths: { "/anime/search": {}, "/episode/{id}/player": {} },
  });
  const evidence = await verifyProviderCandidate(
    candidate,
    mockTransport([
      { body: "" },
      { type: "text/html", body: "Swagger UI" },
      { body: schema },
    ]),
  );
  assert.equal(evidence.status, "DOCUMENTED_REQUIRES_KEY");
  assert.equal(evidence.openApiTitle, "Official API");
});
test("Swagger UI without schema remains unverified", async () => {
  const evidence = await verifyProviderCandidate(
    candidate,
    mockTransport([
      { body: "" },
      { type: "text/html", body: "Swagger API documentation" },
      { status: 404 },
      { status: 404 },
      { status: 404 },
    ]),
  );
  assert.equal(evidence.status, "UNVERIFIED");
});
test("missing docs and timeout are deterministic", async () => {
  assert.equal(
    (
      await verifyProviderCandidate(
        candidate,
        mockTransport(Array(5).fill({ status: 404 })),
      )
    ).status,
    "NO_PUBLIC_DOCUMENTATION",
  );
  assert.equal(
    (
      await verifyProviderCandidate(
        candidate,
        mockTransport(Array(5).fill(new Error("timeout"))),
      )
    ).status,
    "UNAVAILABLE",
  );
});
test("unsupported candidates perform no requests", async () => {
  const transport = mockTransport([]);
  assert.equal(
    (
      await verifyProviderCandidate(
        { ...candidate, defaultStatus: "UNSUPPORTED" },
        transport,
      )
    ).status,
    "UNSUPPORTED",
  );
  assert.equal(transport.requests, 0);
});
test("private addresses are blocked", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "::1",
    "fc00::1",
  ])
    assert.equal(isPrivateAddress(address), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
});
test("redirects, size and sensitive headers are bounded", async () => {
  let calls = 0;
  const resolver = async () => [{ address: "8.8.8.8", family: 4 }] as never;
  const redirects = createProbeTransport(
    (async () => {
      calls += 1;
      return new Response(null, {
        status: 302,
        headers: {
          location: `https://api.example.com/r${calls}`,
          "set-cookie": "secret=token",
        },
      });
    }) as typeof fetch,
    resolver,
  );
  await assert.rejects(
    () => redirects.request("https://api.example.com"),
    /Redirect limit/,
  );
  assert.equal(calls, 4);
  const large = createProbeTransport(
    (async () =>
      new Response("", {
        headers: {
          "content-length": String(MAX_PROBE_BYTES + 1),
          "set-cookie": "apiKey=secret",
        },
      })) as typeof fetch,
    resolver,
  );
  await assert.rejects(
    () => large.request("https://api.example.com"),
    /exceeds 2 MB/,
  );
  assert.equal(large.requests, 1);
});
test("playback is never called and request budget is respected", async () => {
  const transport = mockTransport(Array(5).fill({ status: 404 }));
  const evidence = await verifyProviderCandidate(candidate, transport);
  assert.equal(evidence.networkRequests, 5);
  assert.equal(evidence.playbackRequests, 0);
  assert.ok(
    evidence.responses.every((response) => !response.url.includes("/episode/")),
  );
});
