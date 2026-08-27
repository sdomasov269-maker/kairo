import { performance } from "node:perf_hooks";
import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function openPlayer({ invalid480 = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() => {
    window.__qualityMediaEvents = { waiting: 0, stalled: 0 };
    for (const name of ["waiting", "stalled"])
      document.addEventListener(
        name,
        () => {
          window.__qualityMediaEvents[name] += 1;
        },
        true,
      );
  });
  const network = { manifests: [], segments: 0, failures: [] };
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("manifest.m3u8")) network.manifests.push(url);
    if (/\.(?:ts|m4s)(?:\?|$)/i.test(url)) network.segments += 1;
  });
  page.on("requestfailed", (request) =>
    network.failures.push(request.failure()?.errorText || "request failed"),
  );
  if (invalid480) {
    await page.route("**/api/playback/resolve?**", async (route) => {
      const response = await route.fetch();
      const value = await response.json();
      value.sources = value.sources.map((source) =>
        source.protocol === "hls" && source.quality === 480
          ? { ...source, url: "https://manual-quality.invalid/480.m3u8" }
          : source,
      );
      await route.fulfill({ response, json: value });
    });
    await page.route("https://manual-quality.invalid/**", (route) =>
      route.abort("failed"),
    );
  }
  const resolveStarted = performance.now();
  await page.goto(
    `${baseUrl}/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1#player`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    },
  );
  const player = page.getByTestId("kairo-player");
  await player.waitFor({ timeout: 60_000 });
  const video = player.locator("video");
  await page.waitForFunction(
    () => document.querySelector("video")?.duration > 0,
    null,
    {
      timeout: 60_000,
    },
  );
  return {
    page,
    player,
    video,
    network,
    resolveLatency: performance.now() - resolveStarted,
  };
}

async function selectQuality(player, quality) {
  await player
    .getByRole("button", { name: "Настройки" })
    .evaluate((button) => button.click());
  await player
    .getByRole("button", { name: /Качество/ })
    .evaluate((button) => button.click());
  await player
    .getByRole("menuitemradio", {
      name: quality === "auto" ? "Авто" : `${quality}p`,
    })
    .evaluate((button) => button.click());
}

async function mediaState(video) {
  return video.evaluate((element) => ({
    currentTime: element.currentTime,
    paused: element.paused,
    volume: element.volume,
    muted: element.muted,
    playbackRate: element.playbackRate,
    readyState: element.readyState,
    error: element.error?.message ?? null,
    frames: (() => {
      const quality = element.getVideoPlaybackQuality?.();
      return quality
        ? {
            total: quality.totalVideoFrames,
            dropped: quality.droppedVideoFrames,
          }
        : null;
    })(),
  }));
}

const main = await openPlayer();
const { page, player, video } = main;
const options = await (async () => {
  await player
    .getByRole("button", { name: "Настройки" })
    .evaluate((button) => button.click());
  await player
    .getByRole("button", { name: /Качество/ })
    .evaluate((button) => button.click());
  const labels = await player.getByRole("menuitemradio").allTextContents();
  await page.keyboard.press("Escape");
  return labels.map((value) => value.trim());
})();

const startupStarted = performance.now();
await video.evaluate((element) => element.play());
await page.waitForFunction(
  () => document.querySelector("video")?.currentTime > 2,
  null,
  {
    timeout: 30_000,
  },
);
const startupTime = performance.now() - startupStarted;
const autoStart = await mediaState(video);
await page.waitForTimeout(10_000);
const autoEnd = await mediaState(video);
const autoObservation = {
  start: autoStart,
  end: autoEnd,
  progression: autoEnd.currentTime - autoStart.currentTime,
  events: await page.evaluate(() => window.__qualityMediaEvents),
  fatalErrors: Number(await player.getAttribute("data-hls-fatal-errors")),
};
await video.evaluate((element) => {
  element.currentTime = 30;
  element.volume = 0.37;
  element.muted = true;
  element.playbackRate = 1.5;
});
await page.waitForTimeout(500);
const before480 = await mediaState(video);
await selectQuality(player, 480);
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-selected-quality") === "480",
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(500);
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      video && video.readyState >= 3 && !video.paused && video.currentTime > 31
    );
  },
  null,
  {
    timeout: 30_000,
  },
);
const after480 = await mediaState(video);
await selectQuality(player, 720);
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-selected-quality") === "720",
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(500);
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      video && video.readyState >= 3 && !video.paused && video.currentTime > 31
    );
  },
  null,
  { timeout: 30_000 },
);
const after720 = await mediaState(video);

await selectQuality(player, 480);
await page.waitForTimeout(30);
await selectQuality(player, 360);
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-selected-quality") === "360",
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(500);
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      video && video.readyState >= 3 && !video.paused && video.currentTime > 31
    );
  },
  null,
  { timeout: 30_000 },
);
const rapid = {
  selected: await player.getAttribute("data-selected-quality"),
  state: await mediaState(video),
  fatalErrors: Number(await player.getAttribute("data-hls-fatal-errors")),
};

await selectQuality(player, "auto");
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-selected-quality") === "auto",
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(500);
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      video && video.readyState >= 3 && !video.paused && video.currentTime > 31
    );
  },
  null,
  { timeout: 30_000 },
);
const autoAfterManual = await mediaState(video);

const failed = await openPlayer({ invalid480: true });
await failed.video.evaluate((element) => {
  element.currentTime = 30;
  element.volume = 0.42;
  element.playbackRate = 1.25;
  return element.play();
});
await failed.page.waitForTimeout(500);
await selectQuality(failed.player, 480);
await failed.player
  .getByText("Не удалось переключить качество")
  .waitFor({ timeout: 45_000 });
await failed.page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-selected-quality") === "auto",
  null,
  { timeout: 45_000 },
);
await failed.page.waitForTimeout(500);
await failed.page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      video && video.readyState >= 3 && !video.paused && video.currentTime > 30
    );
  },
  null,
  { timeout: 30_000 },
);
const failureRecovery = {
  selected: await failed.player.getAttribute("data-selected-quality"),
  state: await mediaState(failed.video),
};

console.log(
  JSON.stringify(
    {
      resolveLatency: main.resolveLatency,
      startupTime,
      autoObservation,
      options,
      before480,
      after480,
      after720,
      rapid,
      autoAfterManual,
      network: main.network,
      failureRecovery,
      failedNetwork: failed.network,
    },
    null,
    2,
  ),
);
await browser.close();
