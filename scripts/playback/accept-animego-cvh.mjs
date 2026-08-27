import { performance } from "node:perf_hooks";
import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const network = {
  manifests: 0,
  segments: 0,
  failed: 0,
  corsResponses: 0,
  ranges: 0,
  cvhSameOriginRequests: 0,
  cvhExternalRequests: [],
  cvhLatencies: [],
  failedDetails: [],
  cvhFailed: 0,
};
const requestStarted = new Map();
page.on("request", (request) => {
  const url = request.url();
  requestStarted.set(request, performance.now());
  if (!url.includes("/api/stream/cvh/") && /\.m3u8(?:\?|$)/i.test(url))
    network.manifests += 1;
  if (!url.includes("/api/stream/cvh/") && /\.(?:ts|m4s)(?:\?|$)/i.test(url))
    network.segments += 1;
  if (request.headers()["range"]) network.ranges += 1;
  if (url.includes("/api/stream/cvh/")) network.cvhSameOriginRequests += 1;
  if (/vkuser\.net/i.test(url)) network.cvhExternalRequests.push(url);
});
page.on("requestfailed", (request) => {
  network.failed += 1;
  const detail = {
    url: request.url(),
    error: request.failure()?.errorText || "unknown",
  };
  network.failedDetails.push(detail);
  if (detail.url.includes("/api/stream/cvh/")) network.cvhFailed += 1;
});
page.on("response", async (response) => {
  const started = requestStarted.get(response.request());
  const url = response.url();
  const contentType = response.headers()["content-type"] || "";
  if (url.includes("/api/stream/cvh/")) {
    network.cvhLatencies.push({
      kind: contentType.toLowerCase().includes("mpegurl")
        ? "manifest"
        : "segment",
      ms: started ? performance.now() - started : null,
      status: response.status(),
    });
    if (contentType.toLowerCase().includes("mpegurl")) network.manifests += 1;
    else network.segments += 1;
  }
  if (response.headers()["access-control-allow-origin"])
    network.corsResponses += 1;
});
await page.addInitScript(() => {
  window.__mediaEvents = { waiting: 0, stalled: 0 };
  document.addEventListener(
    "waiting",
    () => {
      window.__mediaEvents.waiting += 1;
    },
    true,
  );
  document.addEventListener(
    "stalled",
    () => {
      window.__mediaEvents.stalled += 1;
    },
    true,
  );
});

await page.goto(`${baseUrl}/debug/providers`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const debug = page.locator("main").last();
const player = debug.locator("[data-testid=kairo-player]");
const video = player.locator("video");
const status = debug.locator("output");

const optionsStart = performance.now();
await debug.getByRole("button", { name: "Load CVH voices" }).click();
await status.filter({ hasText: "CVH voices" }).waitFor({ timeout: 60_000 });
const optionsLatency = performance.now() - optionsStart;
const voices = await debug
  .getByLabel("Translation / voice")
  .locator("option")
  .allTextContents();
const resolveStart = performance.now();
await debug.getByRole("button", { name: "Resolve playback" }).click();
await status
  .filter({ hasText: "descriptor ready" })
  .waitFor({ timeout: 60_000 });
await page.waitForFunction(
  () => {
    const players = document.querySelectorAll("[data-testid=kairo-player]");
    const player = players[players.length - 1];
    const video = player?.querySelector("video");
    return (
      (player?.getAttribute("data-hls-mode") === "mse" &&
        video?.readyState >= 2) ||
      Number(player?.getAttribute("data-hls-fatal-errors")) > 0
    );
  },
  null,
  { timeout: 30_000 },
);
const resolveLatency = performance.now() - resolveStart;
const cvhData = await player.evaluate((element) => ({ ...element.dataset }));
const cvhReady = Number(cvhData.hlsFatalErrors) === 0;
let startupLatency = null;
let progression = 0;
let pausedAt = 0;
let pausedAfter = 0;
let afterSeek = 0;
let cvhQuality = { total: 0, dropped: 0, error: null, bufferAhead: 0 };
let cvhFrames = { last: 0, largest: 0, count: 0 };
let steadyFrames = { last: 0, largest: 0, count: 0 };
if (cvhReady) {
  await video.evaluate((element) => {
    window.__frameStats = { last: 0, largest: 0, count: 0 };
    const callback = (now) => {
      const stats = window.__frameStats;
      if (!element.paused && stats.last)
        stats.largest = Math.max(stats.largest, now - stats.last);
      if (!element.paused) stats.count += 1;
      stats.last = now;
      element.requestVideoFrameCallback(callback);
    };
    element.requestVideoFrameCallback(callback);
  });
  const startupStart = performance.now();
  await video.evaluate((element) => element.play());
  await page.waitForFunction(
    () =>
      document.querySelectorAll("video")[
        document.querySelectorAll("video").length - 1
      ]?.currentTime > 0.5,
    null,
    { timeout: 30_000 },
  );
  startupLatency = performance.now() - startupStart;
  await page.waitForTimeout(30_000);
  progression = await video.evaluate((element) => element.currentTime);
  steadyFrames = await page.evaluate(() => ({ ...window.__frameStats }));
  await player.getByRole("button", { name: "Pause" }).click();
  pausedAt = await video.evaluate((element) => element.currentTime);
  await page.waitForTimeout(1_000);
  pausedAfter = await video.evaluate((element) => element.currentTime);
  await player.getByRole("button", { name: "Play" }).click();
  await page.waitForTimeout(2_000);
  await video.evaluate((element) => {
    element.currentTime = Math.min(
      element.duration - 5,
      element.currentTime + 35,
    );
  });
  await page.waitForTimeout(8_000);
  afterSeek = await video.evaluate((element) => element.currentTime);
  cvhQuality = await video.evaluate((element) => {
    const quality = element.getVideoPlaybackQuality?.();
    let bufferAhead = 0;
    for (let index = 0; index < element.buffered.length; index += 1)
      if (
        element.buffered.start(index) <= element.currentTime &&
        element.buffered.end(index) >= element.currentTime
      )
        bufferAhead = element.buffered.end(index) - element.currentTime;
    return {
      total: quality?.totalVideoFrames ?? 0,
      dropped: quality?.droppedVideoFrames ?? 0,
      error: element.error?.code ?? null,
      bufferAhead,
    };
  });
  cvhFrames = await page.evaluate(() => window.__frameStats);
}
const cvhEvents = await page.evaluate(() => ({ ...window.__mediaEvents }));
const cvhNetwork = structuredClone(network);

await debug.getByLabel("Source").selectOption("mp4");
await page.waitForTimeout(500);
const mp4Available = await player
  .getByRole("button", { name: "Play" })
  .isEnabled({ timeout: 1_000 })
  .catch(() => false);

await debug
  .locator("label")
  .filter({ hasText: /^Provider/ })
  .locator("select")
  .selectOption("kodik");
await debug.getByRole("button", { name: "Load translations" }).click();
await status
  .filter({ hasText: "Kodik translations" })
  .waitFor({ timeout: 60_000 });
await debug.getByLabel("Source").selectOption("auto");
const kodikResolveStart = performance.now();
await debug.getByRole("button", { name: "Resolve playback" }).click();
await status
  .filter({ hasText: "Kodik descriptor ready" })
  .waitFor({ timeout: 60_000 });
await page.waitForFunction(
  () => {
    const players = document.querySelectorAll("[data-testid=kairo-player]");
    return players[players.length - 1]?.getAttribute("data-hls-mode") === "mse";
  },
  null,
  { timeout: 60_000 },
);
const kodikResolveLatency = performance.now() - kodikResolveStart;
const kodikStartupStart = performance.now();
await video.evaluate((element) => element.play());
await page.waitForFunction(
  () => {
    const videos = document.querySelectorAll("video");
    return videos[videos.length - 1]?.currentTime > 0.5;
  },
  null,
  { timeout: 30_000 },
);
const kodikStartupLatency = performance.now() - kodikStartupStart;
await page.waitForTimeout(10_000);
const kodikTime = await video.evaluate((element) => element.currentTime);

console.log(
  JSON.stringify(
    {
      cvh: {
        ready: cvhReady,
        voices,
        optionsLatency,
        resolveLatency,
        startupLatency,
        progression,
        pause: { pausedAt, pausedAfter },
        afterSeek,
        quality: cvhQuality,
        frames: cvhFrames,
        steadyFrames,
        events: cvhEvents,
        telemetry: cvhData,
        mp4Available,
        network: cvhNetwork,
      },
      kodik: {
        resolveLatency: kodikResolveLatency,
        startupLatency: kodikStartupLatency,
        progression: kodikTime,
      },
      network,
    },
    null,
    2,
  ),
);
await browser.close();
