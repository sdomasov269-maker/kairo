import assert from "node:assert/strict";
import test from "node:test";
import { KodikService, sanitizeKodikUrl } from "./kodik.service.ts";

const jsonResponse =
  (body: unknown, status = 200, headers?: HeadersInit) =>
  async () =>
    Response.json(body, { status, headers });

const configured = {
  token: "never-print-this-token",
  enabled: true,
  playbackEnabled: true,
  allowedEmbedHosts: "kodik.info",
  maxRetries: 0,
  logger: { info() {}, warn() {}, error() {} },
};

test("Kodik stays inert until explicitly configured", async () => {
  let calls = 0;
  const service = new KodikService({
    fetchImpl: (async () => {
      calls += 1;
      return Response.json({ results: [] });
    }) as typeof fetch,
  });
  assert.equal(
    await service.getEpisodePlayback({
      malId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
    }),
    null,
  );
  assert.equal(calls, 0);
});

test("Kodik diagnostics report a configuration error without a token", async () => {
  const service = new KodikService({
    token: " ",
    enabled: true,
    playbackEnabled: true,
    allowedEmbedHosts: "kodik.info",
  });
  const report = await service.diagnoseEpisode({
    malId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  assert.equal(report.requestStatus, "CONFIGURATION_ERROR");
  assert.equal(report.attempts, 0);
});

test("Kodik resolves an allowlisted HTTPS episode and normalizes translations", async () => {
  const service = new KodikService({
    ...configured,
    fetchImpl: jsonResponse({
      results: [
        {
          id: 12,
          translation: { id: 7, title: "Dub", type: null },
          seasons: {
            "1": { episodes: { "2": { link: "//kodik.info/episode/2" } } },
          },
        },
      ],
    }) as typeof fetch,
  });
  assert.deepEqual(
    await service.getEpisodePlayback({
      malId: 1,
      seasonNumber: 1,
      episodeNumber: 2,
    }),
    {
      embedUrl: "https://kodik.info/episode/2",
      translation: { id: "7", title: "Dub", type: null },
    },
  );
});

test("Kodik preserves distinct translations and deduplicates translation IDs", async () => {
  const service = new KodikService({
    ...configured,
    fetchImpl: jsonResponse({
      results: [
        { translation: { id: 1, title: "Dub A" } },
        { translation: { id: 2, title: "Dub B" } },
        { translation: { id: 1, title: "Dub A" } },
      ],
    }) as typeof fetch,
  });
  assert.deepEqual(
    (await service.getTranslations(1)).map((item) => item.title),
    ["Dub A", "Dub B"],
  );
});

test("Kodik classifies an empty successful response as NOT_FOUND", async () => {
  const service = new KodikService({
    ...configured,
    fetchImpl: jsonResponse({ results: [] }) as typeof fetch,
  });
  const report = await service.diagnoseEpisode({
    malId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  assert.equal(report.requestStatus, "NOT_FOUND");
  assert.equal(report.httpStatus, 200);
  assert.equal(report.results, 0);
});

for (const [status, expected] of [
  [401, "AUTHENTICATION_ERROR"],
  [403, "FORBIDDEN"],
  [404, "NOT_FOUND"],
] as const) {
  test(`Kodik classifies HTTP ${status} as ${expected}`, async () => {
    const service = new KodikService({
      ...configured,
      fetchImpl: jsonResponse({ error: "upstream" }, status) as typeof fetch,
    });
    const report = await service.diagnoseEpisode({
      malId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
    });
    assert.equal(report.requestStatus, expected);
    assert.equal(report.httpStatus, status);
  });
}

test("Kodik retries 429 and 5xx with bounded backoff", async () => {
  for (const status of [429, 500]) {
    let calls = 0;
    const delays: number[] = [];
    const service = new KodikService({
      ...configured,
      maxRetries: 1,
      sleep: async (milliseconds) => void delays.push(milliseconds),
      fetchImpl: (async () => {
        calls += 1;
        return Response.json(
          calls === 1 ? { error: "temporary" } : { results: [] },
          { status: calls === 1 ? status : 200 },
        );
      }) as typeof fetch,
    });
    const report = await service.diagnoseEpisode({
      malId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
    });
    assert.equal(report.requestStatus, "NOT_FOUND");
    assert.equal(calls, 2);
    assert.equal(delays.length, 1);
  }
});

test("Kodik classifies timeout separately and bounds retries", async () => {
  let calls = 0;
  const service = new KodikService({
    ...configured,
    timeoutMs: 1,
    maxRetries: 1,
    sleep: async () => undefined,
    fetchImpl: (async (_input, init) => {
      calls += 1;
      await new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
        setTimeout(resolve, 100);
      });
      return Response.json({ results: [] });
    }) as typeof fetch,
  });
  const report = await service.diagnoseEpisode({
    malId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  assert.equal(report.requestStatus, "TIMEOUT");
  assert.equal(calls, 2);
});

test("Kodik classifies DNS and other fetch failures as NETWORK_ERROR", async () => {
  const networkError = new TypeError("fetch failed", {
    cause: Object.assign(new Error("dns"), { code: "ENOTFOUND" }),
  });
  const service = new KodikService({
    ...configured,
    fetchImpl: (async () => {
      throw networkError;
    }) as typeof fetch,
  });
  const report = await service.diagnoseEpisode({
    malId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  assert.equal(report.requestStatus, "NETWORK_ERROR");
  assert.equal(report.errorDetail, "ENOTFOUND");
});

test("Kodik distinguishes invalid JSON, content type and schema mismatch", async () => {
  const cases = [
    {
      expected: "INVALID_JSON",
      fetchImpl: async () =>
        new Response("not-json", {
          headers: { "content-type": "application/json" },
        }),
    },
    {
      expected: "UNEXPECTED_CONTENT_TYPE",
      fetchImpl: async () =>
        new Response("<html />", { headers: { "content-type": "text/html" } }),
    },
    {
      expected: "SCHEMA_MISMATCH",
      fetchImpl: jsonResponse({ results: "changed" }),
    },
  ];
  for (const item of cases) {
    const service = new KodikService({
      ...configured,
      fetchImpl: item.fetchImpl as typeof fetch,
    });
    const report = await service.diagnoseEpisode({
      malId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
    });
    assert.equal(report.requestStatus, item.expected);
  }
});

test("Kodik accepts absent optional fields and reports normalized releases", async () => {
  const service = new KodikService({
    ...configured,
    fetchImpl: jsonResponse({
      results: [{ id: "release", title: "Title", shikimori_id: "1" }],
    }) as typeof fetch,
  });
  const report = await service.diagnoseEpisode({
    malId: 1,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  assert.equal(report.requestStatus, "OK");
  assert.equal(report.releases[0]?.kodikId, "release");
  assert.equal(report.releases[0]?.embedUrl, null);
});

test("Kodik rejects malformed, non-HTTPS and unexpected embed hosts", async () => {
  for (const link of [
    "javascript:alert(1)",
    "http://kodik.info/player",
    "https://evil.example/player",
  ]) {
    const service = new KodikService({
      ...configured,
      fetchImpl: jsonResponse({ results: [{ link }] }) as typeof fetch,
    });
    assert.equal(
      await service.getEpisodePlayback({
        malId: 1,
        seasonNumber: 1,
        episodeNumber: 1,
      }),
      null,
    );
  }
});

test("Kodik sends the confirmed shikimori_id parameter and never exposes token", async () => {
  let requestedUrl = "";
  const logs: unknown[] = [];
  const service = new KodikService({
    ...configured,
    logger: {
      info: (...args: unknown[]) => void logs.push(args),
      warn: (...args: unknown[]) => void logs.push(args),
      error: (...args: unknown[]) => void logs.push(args),
    },
    fetchImpl: (async (input) => {
      requestedUrl = String(input);
      return Response.json({ results: [] });
    }) as typeof fetch,
  });
  await service.diagnoseEpisode({
    malId: 38_000,
    seasonNumber: 1,
    episodeNumber: 1,
  });
  const parsed = new URL(requestedUrl);
  assert.equal(parsed.searchParams.get("shikimori_id"), "38000");
  assert.equal(parsed.searchParams.get("token"), configured.token);
  assert.equal(JSON.stringify(logs).includes(configured.token), false);
  assert.equal(sanitizeKodikUrl(requestedUrl), "https://kodik-api.com/search");
});
