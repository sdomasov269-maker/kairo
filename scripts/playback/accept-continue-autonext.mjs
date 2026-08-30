import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://localhost:3000";
const slug = "anilist-196187-smoking-behind-the-supermarket-with-you";
const playbackSlug = "anilist-169583-oh-boy-was-i-wrong-about-her";
const animeUrl = `${baseUrl}/anime/${playbackSlug}?season=1&episode=1#player`;
const email = `continue-autonext-${Date.now()}@example.test`;
const password = "KairoContinue123!";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext();
const page = await context.newPage();
let progressWrites = 0;
page.on("request", (request) => {
  if (request.url().includes("/api/me/progress") && request.method() === "PUT")
    progressWrites += 1;
});

const registration = await page.request.post(`${baseUrl}/api/auth/register`, {
  data: { displayName: "Continue QA", email, password, confirmPassword: password },
});
if (!registration.ok()) throw new Error(`registration ${registration.status()}`);
const csrf = await (await page.request.get(`${baseUrl}/api/auth/csrf`)).json();
const login = await page.request.post(
  `${baseUrl}/api/auth/callback/credentials`,
  {
    form: {
      csrfToken: csrf.csrfToken,
      email,
      password,
      callbackUrl: baseUrl,
      json: "true",
    },
  },
);
if (!login.ok()) throw new Error(`login ${login.status()}`);
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
const session = await page.evaluate(async () =>
  (await fetch("/api/auth/session", { cache: "no-store" })).json(),
);
if (!session?.user?.id) throw new Error("login session was not retained");

const openEpisode = async (episode) => {
  await page.goto(`${baseUrl}/anime/${playbackSlug}?season=1&episode=${episode}#player`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="kairo-player"]')
        ?.getAttribute("data-hls-mode") === "mse",
    null,
    { timeout: 60_000 },
  );
  return page.locator("video");
};
const progress = async () =>
  page.evaluate(async () =>
    (await fetch("/api/me/progress", { cache: "no-store" })).json(),
  );
const putProgress = async (
  episodeNumber,
  currentTime,
  duration = 100,
  animeKey = slug,
) => {
  const response = await page.request.put(`${baseUrl}/api/me/progress`, {
    data: {
      animeKey,
      seasonNumber: 1,
      episodeNumber,
      currentTime,
      duration,
      completed: currentTime / duration >= 0.95,
      updatedAt: new Date().toISOString(),
    },
  });
  if (!response.ok()) throw new Error(`progress PUT ${response.status()}`);
};
const dispatchEnded = async () => {
  await page.locator("video").evaluate((video) => {
    video.dispatchEvent(new Event("ended"));
  });
};

await putProgress(1, 25);
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
const card = page.locator(`a[href*="${slug}"][href*="episode=1"]`).first();
await card.waitFor({ state: "visible", timeout: 30_000 }).catch(async () => {
  console.log("HOME_DEBUG", JSON.stringify({
    progress: await progress(),
    section: await page.locator('[data-testid="continue-watching"]').evaluate((element) => ({ ...element.dataset })),
    animeLinks: await page.locator('a[href*="/anime/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  }));
  throw new Error("Continue Watching card was not rendered");
});
const firstCard = {
  href: await card.getAttribute("href"),
  progress: await card.locator('[aria-label$="%"]') .getAttribute("aria-label"),
};
await card.click();
await page.waitForFunction(
  (slug) => location.pathname === `/anime/${slug}` && new URL(location.href).searchParams.get("episode") === "1",
  slug,
  { timeout: 30_000 },
);
const resumeClickRoute = page.url();
await putProgress(1, 25, 100, playbackSlug);
await openEpisode(1);
await page.waitForFunction(
  () =>
    Number(
      document
        .querySelector('[data-testid="kairo-player"]')
        ?.getAttribute("data-resume-position") ?? 0,
    ) >= 24,
  null,
  { timeout: 60_000 },
);
const resumeFromCard = Number(
  await page
    .locator('[data-testid="kairo-player"]')
    .getAttribute("data-resume-position"),
);

await putProgress(2, 15);
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
const cards = page.locator(`a[href*="${slug}"][href*="episode="]`);
await page.waitForFunction(
  (slug) => document.querySelector(`a[href*="${slug}"][href*="episode=2"]`),
  slug,
  { timeout: 30_000 },
);
const newestCard = {
  count: await cards.count(),
  href: await cards.first().getAttribute("href"),
};

await putProgress(2, 96);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(
  (slug) => document.querySelector(`a[href*="${slug}"][href*="episode=1"]`),
  slug,
  { timeout: 30_000 },
);
const completedFallsBackToEpisodeOne = await page
  .locator(`a[href*="${slug}"][href*="episode=1"]`)
  .count();
await putProgress(1, 96);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="continue-watching"]')
      ?.getAttribute("data-progress-mode") === "account",
  null,
  { timeout: 30_000 },
);
await page.waitForTimeout(1_000);
const completedAnimeCards = await page.locator(`a[href*="${slug}"][href*="episode="]`).count();

await putProgress(1, 25, 100, playbackSlug);
await putProgress(2, 18, 100, playbackSlug);
await openEpisode(1);
await dispatchEnded();
const overlay = page.locator('[data-testid="autonext"]');
await overlay.waitFor({ state: "visible" });
const countdownText = await overlay.textContent();
await overlay.getByRole("button", { name: "Отмена" }).click();
await page.waitForTimeout(500);
const cancelledHidden = await overlay.count();
await dispatchEnded();
await page.waitForTimeout(500);
const cancelledDidNotRepeat = await overlay.count();

await page.goto(`${baseUrl}/catalog`, { waitUntil: "domcontentloaded" });
await openEpisode(1);
await dispatchEnded();
await overlay.getByRole("button", { name: "Смотреть сейчас" }).click();
await page.waitForFunction(
  () => new URL(location.href).searchParams.get("episode") === "2",
  null,
  { timeout: 30_000 },
);
await page.waitForFunction(
  () =>
    Number(
      document
        .querySelector('[data-testid="kairo-player"]')
        ?.getAttribute("data-resume-position") ?? 0,
    ) >= 17,
  null,
  { timeout: 60_000 },
);
const watchNowResume = Number(
  await page
    .locator('[data-testid="kairo-player"]')
    .getAttribute("data-resume-position"),
);
const translationAfter = await page.locator("#playback-translation").getAttribute("data-value");

await openEpisode(1);
const translationBefore = await page.locator("#playback-translation").getAttribute("data-value");
await dispatchEnded();
await page.waitForFunction(
  () => new URL(location.href).searchParams.get("episode") === "2",
  null,
  { timeout: 15_000 },
);
const automaticEpisode = new URL(page.url()).searchParams.get("episode");

await openEpisode(12);
await dispatchEnded();
await page.waitForTimeout(1_000);
const lastEpisodeOverlay = await overlay.count();

const guestContext = await browser.newContext();
const guest = await guestContext.newPage();
let guestWrites = 0;
guest.on("request", (request) => {
  if (request.url().includes("/api/me/progress") && request.method() === "PUT")
    guestWrites += 1;
});
await guest.goto(animeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await guest.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="kairo-player"]')
      ?.getAttribute("data-hls-mode") === "mse",
  null,
  { timeout: 60_000 },
);
await guest.locator("video").evaluate((video) => {
  video.dispatchEvent(new Event("ended"));
});
await guest.locator('[data-testid="autonext"]').waitFor({ state: "visible" });
await guest.locator('[data-testid="autonext"]').getByRole("button", { name: "Смотреть сейчас" }).click();
await guest.waitForFunction(() => new URL(location.href).searchParams.get("episode") === "2", null, { timeout: 30_000 });

console.log(JSON.stringify({
  continueWatching: {
    firstCard,
    resumeClickRoute,
    resumeFromCard,
    newestCard,
    completedFallsBackToEpisodeOne,
    completedAnimeCards,
  },
  autonext: {
    countdownText,
    cancelledHidden,
    cancelledDidNotRepeat,
    watchNowResume,
    automaticEpisode,
    lastEpisodeOverlay,
    translationPreserved: translationBefore === translationAfter,
  },
  guest: {
    episode: new URL(guest.url()).searchParams.get("episode"),
    progressWrites: guestWrites,
  },
  progressWrites,
  progress: (await progress()).data.map((entry) => ({
    episode: entry.episodeNumber,
    completed: entry.completed,
    currentTime: entry.currentTime,
  })),
}, null, 2));

await guestContext.close();
await context.close();
await browser.close();
