import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://127.0.0.1:3000";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  headless: false,
  executablePath: chrome,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const requests = { manifests: 0, segments: 0 };
page.on("request", (request) => {
  const url = request.url();
  if (/\.m3u8(?:\?|$)/i.test(url)) requests.manifests += 1;
  if (/\.(?:ts|m4s)(?:\?|$)/i.test(url)) requests.segments += 1;
});

const mediaEvents = { stalled: 0, waiting: 0 };
await page.addInitScript(() => {
  document.addEventListener(
    "stalled",
    () => {
      window.__kairoStalled = (window.__kairoStalled || 0) + 1;
    },
    true,
  );
  document.addEventListener(
    "waiting",
    () => {
      window.__kairoWaiting = (window.__kairoWaiting || 0) + 1;
    },
    true,
  );
});

const animeSlug =
  process.env.KAIRO_ANIME_SLUG ||
  "anilist-156067-tondemo-skill-de-isekai-hourou-meshi";
await page.goto(`${baseUrl}/anime/${animeSlug}?episode=1#player`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const watchRegion = page.locator("section#player").last();
const player = watchRegion.locator("[data-testid=kairo-player]");
const video = player.locator("video");
const translationSelect = watchRegion.locator("#playback-translation");
await video.waitFor({ state: "attached", timeout: 60_000 });
await translationSelect.waitFor({ state: "attached" });
await page.waitForFunction(
  () => {
    const select = document.querySelector("#playback-translation");
    return select && !select.disabled && select.options.length > 0;
  },
  null,
  { timeout: 60_000 },
);
const translations = await translationSelect
  .locator("option")
  .allTextContents();
await page.waitForFunction(
  () => {
    const players = document.querySelectorAll("[data-testid=kairo-player]");
    const active = players[players.length - 1];
    const media = active?.querySelector("video");
    return (
      active?.getAttribute("data-hls-mode") === "mse" && media?.readyState >= 2
    );
  },
  null,
  { timeout: 60_000 },
);
await video.evaluate((element) => element.play());
await page.waitForTimeout(10_000);
const first = await video.evaluate((element) => element.currentTime);
await page.waitForTimeout(5_000);
const second = await video.evaluate((element) => element.currentTime);

await player.getByRole("button", { name: "Pause" }).click();
const pausedAt = await video.evaluate((element) => element.currentTime);
await page.waitForTimeout(1_000);
const pausedAfter = await video.evaluate((element) => element.currentTime);
await player.getByRole("button", { name: "Play" }).click();
await page.waitForTimeout(3_000);
const resumedAt = await video.evaluate((element) => element.currentTime);
await video.evaluate((element) => {
  element.currentTime = Math.min(
    element.duration - 5,
    element.currentTime + 35,
  );
});
await page.waitForTimeout(5_000);
const seekedAt = await video.evaluate((element) => element.currentTime);

const fullscreenButton = player.getByRole("button", { name: "Fullscreen" });
await fullscreenButton.click();
await page.waitForTimeout(500);
const fullscreen = await page.evaluate(() =>
  Boolean(document.fullscreenElement),
);
if (fullscreen) await page.evaluate(() => document.exitFullscreen());

const playbackQuality = await video.evaluate((element) => {
  const q = element.getVideoPlaybackQuality?.();
  return {
    total: q?.totalVideoFrames ?? 0,
    dropped: q?.droppedVideoFrames ?? 0,
    error: element.error?.code ?? null,
  };
});

let episodeSwitch = "NOT AVAILABLE";
const episodeButtons = watchRegion.locator(
  '[aria-label="Выбор эпизода"] button',
);
if ((await episodeButtons.count()) > 1) {
  await episodeButtons.nth(1).click();
  await page.waitForFunction(
    () => new URL(location.href).searchParams.get("episode") === "2",
  );
  await page.waitForTimeout(5_000);
  const afterSwitch = await video.evaluate((element) => ({
    time: element.currentTime,
    error: element.error?.code ?? null,
  }));
  episodeSwitch = afterSwitch.error === null ? "PASS" : "FAIL";
}

let translationSwitch = translations.length > 1 ? "FAIL" : "NOT AVAILABLE";
if (translations.length > 1) {
  const select = translationSelect;
  const before = await select.inputValue();
  await select.selectOption({ index: 1 });
  await page.waitForFunction(
    (previous) =>
      document.querySelector("#playback-translation")?.value !== previous,
    before,
  );
  await page.waitForTimeout(5_000);
  const afterSwitch = await video.evaluate((element) => ({
    time: element.currentTime,
    error: element.error?.code ?? null,
  }));
  translationSwitch = afterSwitch.error === null ? "PASS" : "FAIL";
}

const responsive = {};
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["tablet", 900, 900],
  ["mobile", 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(350);
  responsive[name] = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    playerRight:
      document
        .querySelector("[data-testid=kairo-player]")
        ?.getBoundingClientRect().right ?? 0,
  }));
}

const playerData = await player.evaluate((element) => ({ ...element.dataset }));
mediaEvents.stalled = await page.evaluate(() => window.__kairoStalled || 0);
mediaEvents.waiting = await page.evaluate(() => window.__kairoWaiting || 0);

const redirectPage = await browser.newPage();
await redirectPage.goto(`${baseUrl}/watch/${animeSlug}/1?season=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await redirectPage.waitForURL(/\/anime\/.*[?&]episode=1/, { timeout: 60_000 });
const redirectUrl = redirectPage.url();
await redirectPage.close();

console.log(
  JSON.stringify(
    {
      url: page.url(),
      translations,
      progression: { first, second },
      pause: { pausedAt, pausedAfter, resumedAt },
      seekedAt,
      fullscreen,
      episodeSwitch,
      translationSwitch,
      responsive,
      quality: playbackQuality,
      playerData,
      mediaEvents,
      requests,
      redirectUrl,
    },
    null,
    2,
  ),
);
await browser.close();
