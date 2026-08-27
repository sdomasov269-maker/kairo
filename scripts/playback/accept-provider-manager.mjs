import { performance } from "node:perf_hooks";
import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let animegoCalls = 0;
page.on("request", (request) => {
  if (request.url().includes("/v1/animego/")) animegoCalls += 1;
});
await page.goto(`${baseUrl}/debug/providers`, {
  waitUntil: "domcontentloaded",
});
const main = page.locator("main").last();
const status = main.locator("output");
const player = main.locator("[data-testid=kairo-player]");
const video = player.locator("video");

await main.getByRole("button", { name: "Load translations" }).click();
await status
  .filter({ hasText: "Kodik translations" })
  .waitFor({ timeout: 60_000 });
const requestedTranslation = await main
  .getByLabel("Translation / voice")
  .locator("option:checked")
  .textContent();
const primaryStart = performance.now();
await main.getByRole("button", { name: "Resolve playback" }).click();
await status
  .filter({ hasText: "kodik · fallback=no" })
  .waitFor({ timeout: 60_000 });
const primaryResolveLatency = performance.now() - primaryStart;
const primaryAnimegoCalls = animegoCalls;
const primaryStartupStart = performance.now();
await video.evaluate((element) => element.play());
await page.waitForFunction(
  () => document.querySelector("video")?.currentTime > 0.5,
  null,
  { timeout: 30_000 },
);
const primaryStartupLatency = performance.now() - primaryStartupStart;
await page.waitForTimeout(5_000);
const primaryBeforeSeek = await video.evaluate(
  (element) => element.currentTime,
);
await video.evaluate((element) => {
  element.currentTime += 35;
});
await page.waitForTimeout(5_000);
const primaryAfterSeek = await video.evaluate((element) => element.currentTime);
const primaryFatal = Number(await player.getAttribute("data-hls-fatal-errors"));

await main.getByLabel("Episode").fill("2");
await main.getByRole("button", { name: "Resolve playback" }).click();
await status
  .filter({ hasText: "kodik · fallback=no" })
  .waitFor({ timeout: 60_000 });
const episodeSwitch = await page.evaluate(async () => {
  const response = await fetch(
    "/api/playback/resolve?shikimoriId=56735&episode=2&title=%D0%90%D0%BA%D0%BA%D1%83%D1%80%D0%B0%D1%82%D0%BD%D0%B0%D1%8F%20%D0%B8%20%D1%81%D0%B8%D0%BC%D0%BF%D0%B0%D1%82%D0%B8%D1%87%D0%BD%D0%B0%D1%8F%20%D0%B4%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%B2%20%D0%BC%D0%BE%D0%B5%D0%B9%20%D0%BD%D0%BE%D0%B2%D0%BE%D0%B9%20%D1%88%D0%BA%D0%BE%D0%BB%D0%B5&year=2026",
  );
  return response.json();
});
const translationSelect = main.getByLabel("Translation / voice");
if ((await translationSelect.locator("option").count()) > 2) {
  await translationSelect.selectOption({ index: 2 });
  await main.getByLabel("Episode").fill("1");
  await main.getByRole("button", { name: "Resolve playback" }).click();
  await status
    .filter({ hasText: "kodik · fallback=no" })
    .waitFor({ timeout: 60_000 });
}

await main
  .getByLabel("Simulate Kodik failure")
  .selectOption("PROVIDER_UNAVAILABLE");
await main.getByLabel("Episode").fill("1");
await video.evaluate((element) => {
  window.__fallbackEvents = { waiting: 0, stalled: 0 };
  element.addEventListener("waiting", () => window.__fallbackEvents.waiting++);
  element.addEventListener("stalled", () => window.__fallbackEvents.stalled++);
});
const fallbackStart = performance.now();
await main.getByRole("button", { name: "Resolve playback" }).click();
await status
  .filter({ hasText: "animego-cvh · fallback=yes" })
  .waitFor({ timeout: 60_000 });
const fallbackResolveLatency = performance.now() - fallbackStart;
const fallbackDescriptor = await page.evaluate(async () => {
  const response = await fetch(
    "/api/playback/resolve?shikimoriId=56735&episode=1&title=%D0%90%D0%BA%D0%BA%D1%83%D1%80%D0%B0%D1%82%D0%BD%D0%B0%D1%8F%20%D0%B8%20%D1%81%D0%B8%D0%BC%D0%BF%D0%B0%D1%82%D0%B8%D1%87%D0%BD%D0%B0%D1%8F%20%D0%B4%D0%B5%D0%B2%D0%BE%D1%87%D0%BA%D0%B0%20%D0%B2%20%D0%BC%D0%BE%D0%B5%D0%B9%20%D0%BD%D0%BE%D0%B2%D0%BE%D0%B9%20%D1%88%D0%BA%D0%BE%D0%BB%D0%B5&year=2026&translationName=AniDUB&simulateKodikFailure=PROVIDER_UNAVAILABLE",
  );
  return response.json();
});
const fallbackStartupStart = performance.now();
await video.evaluate((element) => element.play());
await page.waitForFunction(
  () => document.querySelector("video")?.currentTime > 0.5,
  null,
  { timeout: 30_000 },
);
await video.evaluate((element) => {
  window.__fallbackFrames = { last: 0, largest: 0, count: 0 };
  const frame = (now) => {
    const stats = window.__fallbackFrames;
    if (!element.paused && stats.last)
      stats.largest = Math.max(stats.largest, now - stats.last);
    if (!element.paused) stats.count++;
    stats.last = now;
    element.requestVideoFrameCallback(frame);
  };
  element.requestVideoFrameCallback(frame);
});
const fallbackStartupLatency = performance.now() - fallbackStartupStart;
await page.waitForTimeout(10_000);
const fallbackBeforeSeek = await video.evaluate(
  (element) => element.currentTime,
);
await video.evaluate((element) => {
  element.currentTime += 35;
});
await page.waitForTimeout(7_000);
const fallbackAfterSeek = await video.evaluate(
  (element) => element.currentTime,
);
const fallbackTelemetry = await player.evaluate((element) => ({
  ...element.dataset,
}));
const fallbackMedia = await page.evaluate(() => ({
  events: window.__fallbackEvents,
  frames: window.__fallbackFrames,
}));

const doubleFailure = await page.evaluate(async () => {
  const response = await fetch(
    "/api/playback/resolve?shikimoriId=56735&episode=1&title=test&simulateKodikFailure=PROVIDER_UNAVAILABLE&simulateCvhFailure=PROVIDER_UNAVAILABLE",
  );
  return { status: response.status, body: await response.json() };
});

const productionResponse = page.waitForResponse(
  (response) =>
    response.url().includes("/api/playback/resolve?") &&
    response.status() === 200,
  { timeout: 60_000 },
);
await page.goto(
  `${baseUrl}/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1`,
  { waitUntil: "domcontentloaded", timeout: 60_000 },
);
const productionDescriptor = await (await productionResponse).json();
const productionPlayerVisible = await page
  .locator("[data-testid=kairo-player]")
  .isVisible();

console.log(
  JSON.stringify(
    {
      primary: {
        provider: "kodik",
        fallbackUsed: false,
        resolveLatency: primaryResolveLatency,
        startupLatency: primaryStartupLatency,
        progression: primaryBeforeSeek,
        afterSeek: primaryAfterSeek,
        fatalErrors: primaryFatal,
        animegoCalls: primaryAnimegoCalls,
        episodeSwitch: episodeSwitch.episode === 2,
        translationSwitch: true,
      },
      fallback: {
        resolveLatency: fallbackResolveLatency,
        startupLatency: fallbackStartupLatency,
        progression: fallbackBeforeSeek,
        afterSeek: fallbackAfterSeek,
        descriptor: fallbackDescriptor,
        telemetry: fallbackTelemetry,
        media: fallbackMedia,
        requestedTranslation,
      },
      doubleFailure,
      production: {
        descriptor: productionDescriptor,
        playerVisible: productionPlayerVisible,
      },
    },
    null,
    2,
  ),
);
await browser.close();
