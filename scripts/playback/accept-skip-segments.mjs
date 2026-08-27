import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://localhost:3000";
const slug = "anilist-169583-oh-boy-was-i-wrong-about-her";
const animeUrl = `${baseUrl}/anime/${slug}?season=1&episode=1#player`;
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const guestContext = await browser.newContext();
const page = await guestContext.newPage();

const openEpisode = async (episode = 1) => {
  await page.goto(`${baseUrl}/anime/${slug}?season=1&episode=${episode}#player`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => {
      const player = document.querySelector('[data-testid="kairo-player"]');
      const video = player?.querySelector("video");
      return player?.getAttribute("data-hls-mode") === "mse" && video?.readyState >= 1;
    },
    null,
    { timeout: 60_000 },
  );
};
const seek = async (time) => {
  await page.locator("video").evaluate((video, target) => {
    video.currentTime = target;
    video.dispatchEvent(new Event("timeupdate"));
  }, time);
  await page.waitForTimeout(250);
};

const descriptor = await page.request.get(
  `${baseUrl}/api/playback/resolve?shikimoriId=56735&episode=1&translationId=609&translationName=AniDUB&title=Oh%20Boy%20Was%20I%20Wrong%20About%20Her&year=2026&mediaType=TV`,
);
if (!descriptor.ok()) throw new Error(`descriptor ${descriptor.status()}`);
const descriptorBody = await descriptor.json();

await openEpisode();
await seek(60);
const opening = page.getByRole("button", { name: "Пропустить опенинг" });
await opening.waitFor({ state: "visible" });
await page.locator("video").evaluate((video) => video.play());
await opening.click();
await page.waitForFunction(() => (document.querySelector("video")?.currentTime ?? 0) >= 144.5);
const openingTarget = await page.locator("video").evaluate((video) => video.currentTime);
await page.waitForTimeout(5_000);
const openingContinued = await page.locator("video").evaluate((video) => video.currentTime);

await seek(60);
await opening.waitFor({ state: "visible" });
const seekBackVisible = await opening.isVisible();

const translation = page.locator("#playback-translation");
const translationCount = await translation.locator("option").count();
if (translationCount > 1) {
  await translation.selectOption({ index: 1 });
  await page.waitForTimeout(100);
}
const translationCleanup = await opening.count();

await openEpisode();
await seek(60);
await opening.waitFor({ state: "visible" });
await page.goto(`${baseUrl}/anime/${slug}?season=1&episode=2#player`, {
  waitUntil: "domcontentloaded",
});
const episodeCleanup = await opening.count();

await openEpisode();
await seek(1360);
const ending = page.getByRole("button", { name: "Пропустить эндинг" });
await ending.waitFor({ state: "visible" });
await page.locator("video").evaluate((video) => video.play());
await ending.click();
await page.waitForFunction(() => (document.querySelector("video")?.currentTime ?? 0) >= 1441.5);
const endingTarget = await page.locator("video").evaluate((video) => video.currentTime);
await page.locator('[data-testid="autonext"]').waitFor({ state: "visible", timeout: 15_000 });
const autonextAfterEnding = await page.locator('[data-testid="autonext"]').isVisible();

const account = await browser.newContext();
const accountPage = await account.newPage();
const email = `skip-resume-${Date.now()}@example.test`;
const password = "KairoSkip123!";
await accountPage.request.post(`${baseUrl}/api/auth/register`, {
  data: { displayName: "Skip QA", email, password, confirmPassword: password },
});
const csrf = await (await accountPage.request.get(`${baseUrl}/api/auth/csrf`)).json();
await accountPage.request.post(`${baseUrl}/api/auth/callback/credentials`, {
  form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: baseUrl, json: "true" },
});
await accountPage.request.put(`${baseUrl}/api/me/progress`, {
  data: {
    animeKey: slug,
    seasonNumber: 1,
    episodeNumber: 1,
    currentTime: 60,
    duration: 1442.188,
    completed: false,
    updatedAt: new Date().toISOString(),
  },
});
await accountPage.goto(animeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await accountPage.waitForFunction(
  () =>
    (document.querySelector("video")?.currentTime ?? 0) >= 59 &&
    Boolean(document.querySelector('[data-testid="skip-opening"]')),
  null,
  { timeout: 60_000 },
);
const resumeInsideVisible = await accountPage.locator('[data-testid="skip-opening"]').isVisible();

console.log(JSON.stringify({
  skipSegments: descriptorBody.skipSegments,
  opening: {
    target: openingTarget,
    continuedTo: openingContinued,
    seekBackVisible,
  },
  ending: { target: endingTarget, autonextAfterEnding },
  resumeInsideVisible,
  episodeCleanup,
  translationCleanup,
}, null, 2));

await account.close();
await guestContext.close();
await browser.close();
