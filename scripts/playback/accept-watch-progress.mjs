import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://127.0.0.1:3001";
const animePath =
  "/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1";
const email = `watch-progress-${Date.now()}@example.test`;
const password = "KairoWatch123!";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext();
const page = await context.newPage();
let writes = 0;
let authConsoleErrors = 0;
page.on("request", (request) => {
  if (request.url().includes("/api/me/progress") && request.method() === "PUT")
    writes++;
});
page.on("console", (message) => {
  if (message.type() === "error" && /auth|unauthor/i.test(message.text()))
    authConsoleErrors++;
});

const registered = await page.request.post(`${baseUrl}/api/auth/register`, {
  data: { displayName: "Watch QA", email, password, confirmPassword: password },
});
if (!registered.ok())
  throw new Error(`registration failed ${registered.status()}`);
await page.goto(`${baseUrl}/login`);
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.locator("form .button-primary").click();
await page.waitForURL(`${baseUrl}/`, { timeout: 30_000 });
const session = await page.evaluate(async () =>
  (await fetch("/api/auth/session")).json(),
);
if (!session?.user?.id) throw new Error("login session was not established");

const openAnime = async (path = animePath) => {
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const video = page.locator("video");
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
    null,
    { timeout: 60_000 },
  );
  return video;
};
const waitForSavedPosition = async (episodeNumber, minimum) => {
  await page.waitForFunction(
    async ({ episodeNumber, minimum }) => {
      const response = await fetch("/api/me/progress", { cache: "no-store" });
      const body = await response.json();
      return body.data?.some(
        (entry) =>
          entry.episodeNumber === episodeNumber && entry.currentTime >= minimum,
      );
    },
    { episodeNumber, minimum },
    { timeout: 30_000 },
  );
};
let video = await openAnime();
await page.waitForFunction(
  () => document.querySelector("[data-progress-mode]")?.getAttribute("data-progress-mode") === "account",
  null,
  { timeout: 30_000 },
);
await video.evaluate(async (element) => {
  await element.play();
  element.currentTime = 26;
});
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return video && !video.seeking && video.currentTime >= 25;
  },
  null,
  { timeout: 30_000 },
);
await video.evaluate((element) => element.pause());
await page.waitForTimeout(1_500);
const savedEpisodeOne = await page.evaluate(async () => {
  const response = await fetch("/api/me/progress", { cache: "no-store" });
  return response.json();
});
console.log(
  "INITIAL_SAVE",
  JSON.stringify({
    writes,
    sessionUser: session.user.id,
    savedEpisodeOne,
    playerMode: await page.locator("[data-progress-mode]").getAttribute("data-progress-mode"),
    videoDataset: await video.evaluate((element) => ({ ...element.dataset })),
  }),
);

video = await openAnime();
await page
  .waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) >= 24,
    null,
    { timeout: 15_000 },
  )
  .catch(async () => {
    console.log(
      "RESUME_DEBUG",
      {
        api: await page.evaluate(async () =>
          (await fetch("/api/me/progress", { cache: "no-store" })).json(),
        ),
        panel: await page.locator("[data-progress-mode]").evaluate((element) => ({
          mode: element.getAttribute("data-progress-mode"),
          count: element.getAttribute("data-progress-count"),
          sync: element.getAttribute("data-progress-sync-status"),
        })),
        player: await page.locator("[data-testid=kairo-player]").evaluate((element) => ({
          target: element.getAttribute("data-resume-position"),
          currentTime: element.querySelector("video")?.currentTime,
          duration: element.querySelector("video")?.duration,
          readyState: element.querySelector("video")?.readyState,
          applied: element.querySelector("video")?.dataset.resumeApplied,
        })),
      },
    );
    throw new Error("resume after reload was not applied");
  });
const resumeAfterReload = await video.evaluate(
  (element) => element.currentTime,
);

await page.goto(`${baseUrl}/catalog`, { waitUntil: "domcontentloaded" });
video = await openAnime();
await page.waitForFunction(
  () => (document.querySelector("video")?.currentTime ?? 0) >= 24,
  null,
  { timeout: 60_000 },
);
const resumeAfterNavigation = await video.evaluate(
  (element) => element.currentTime,
);

await video.evaluate(async (element) => {
  await element.play();
  element.currentTime = 31;
});
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return video && !video.seeking && video.currentTime >= 30;
  },
  null,
  { timeout: 30_000 },
);
const translation = page.locator("#playback-translation");
await video.evaluate((element) => delete element.dataset.resumeApplied);
await translation.selectOption({ index: 1 });
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return (
      Number(video?.dataset.resumeApplied ?? 0) >= 29 &&
      (video?.currentTime ?? 0) >= 29
    );
  },
  null,
  { timeout: 60_000 },
);
const afterTranslationSwitch = await video.evaluate(
  (element) => element.currentTime,
);

await video.evaluate((element) => element.pause());
await page.waitForTimeout(1_000);
await waitForSavedPosition(1, 30);
video = await openAnime(animePath.replace("episode=1", "episode=2"));
await video.evaluate(async (element) => {
  await element.play();
  element.currentTime = 16;
});
await page.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return video && !video.seeking && video.currentTime >= 15;
  },
  null,
  { timeout: 30_000 },
);
await video.evaluate((element) => element.pause());
await waitForSavedPosition(2, 15);
video = await openAnime();
await page
  .waitForFunction(
    () => (document.querySelector("video")?.currentTime ?? 0) >= 29,
    null,
    { timeout: 60_000 },
  )
  .catch(async () => {
    console.log(
      "EPISODE_RETURN_DEBUG",
      JSON.stringify({
        progress: await page.evaluate(async () =>
          (await fetch("/api/me/progress", { cache: "no-store" })).json(),
        ),
        panel: await page.locator("[data-progress-mode]").evaluate((element) => ({
          mode: element.getAttribute("data-progress-mode"),
          count: element.getAttribute("data-progress-count"),
          sync: element.getAttribute("data-progress-sync-status"),
        })),
        player: await page
          .locator("[data-testid=kairo-player]")
          .evaluate((element) => ({
            target: element.getAttribute("data-resume-position"),
            currentTime: element.querySelector("video")?.currentTime,
            duration: element.querySelector("video")?.duration,
            applied: element.querySelector("video")?.dataset.resumeApplied,
          })),
      }),
    );
    throw new Error("episode-one resume was not restored");
  });
const episodeOneReturn = await video.evaluate((element) => element.currentTime);

video = await openAnime(
  `${animePath}&simulateKodikFailure=PROVIDER_UNAVAILABLE`,
);
await page.waitForFunction(
  () =>
    document
      .querySelector("[data-testid=kairo-player]")
      ?.getAttribute("data-hls-mode") === "mse",
  null,
  { timeout: 60_000 },
);
await page.waitForFunction(
  () => (document.querySelector("video")?.currentTime ?? 0) >= 29,
  null,
  { timeout: 60_000 },
);
const fallbackResume = await video.evaluate((element) => element.currentTime);

const beforeMinuteWrites = writes;
await video.evaluate((element) => element.play());
await page.waitForTimeout(60_000);
await video.evaluate((element) => element.pause());
await page.waitForTimeout(1_000);
const writesDuringMinute = writes - beforeMinuteWrites;

video = await openAnime(animePath.replace("episode=1", "episode=2"));
await page.waitForFunction(
  () => (document.querySelector("video")?.currentTime ?? 0) >= 15,
  null,
  { timeout: 60_000 },
);
const episodeTwoReturn = await video.evaluate((element) => element.currentTime);

const finalProgress = await page.evaluate(async () =>
  (await fetch("/api/me/progress", { cache: "no-store" })).json(),
);
const episodeOneDuration = finalProgress.data.find(
  (entry) => entry.episodeNumber === 1,
)?.duration;
if (!episodeOneDuration) throw new Error("episode-one duration is missing");
const completedWrite = await page.request.put(`${baseUrl}/api/me/progress`, {
  data: {
    animeKey: "anilist-169583-oh-boy-was-i-wrong-about-her",
    seasonNumber: 1,
    episodeNumber: 1,
    currentTime: episodeOneDuration * 0.96,
    duration: episodeOneDuration,
    completed: true,
    updatedAt: new Date().toISOString(),
  },
});
if (!completedWrite.ok())
  throw new Error(`completed write failed ${completedWrite.status()}`);
video = await openAnime();
await page.waitForTimeout(2_000);
const completedResumePosition = await video.evaluate(
  (element) => element.currentTime,
);
const completedProgress = await page.evaluate(async () =>
  (await fetch("/api/me/progress", { cache: "no-store" })).json(),
);

const guestContext = await browser.newContext();
const guest = await guestContext.newPage();
let guestWrites = 0;
let guestAuthErrors = 0;
guest.on("request", (request) => {
  if (request.url().includes("/api/me/progress") && request.method() === "PUT")
    guestWrites++;
});
guest.on("console", (message) => {
  if (message.type() === "error" && /auth|unauthor/i.test(message.text()))
    guestAuthErrors++;
});
await guest.goto(`${baseUrl}${animePath}`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await guest.waitForFunction(
  () => document.querySelector("video")?.readyState >= 1,
  null,
  { timeout: 60_000 },
);
await guest.locator("video").evaluate(async (element) => {
  await element.play();
  element.currentTime = 12;
});
await guest.waitForFunction(
  () => {
    const video = document.querySelector("video");
    return video && !video.seeking && video.currentTime >= 11;
  },
  null,
  { timeout: 30_000 },
);
await guest.locator("video").evaluate((element) => element.pause());
await guest.waitForTimeout(1_000);
const guestCurrentTime = await guest
  .locator("video")
  .evaluate((element) => element.currentTime);
const guestPendingQueueWrites = await guest.evaluate(() => {
  const queue = JSON.parse(localStorage.getItem("kairo:pending-sync:v1") ?? "[]");
  return Array.isArray(queue)
    ? queue.filter((entry) => entry.type === "progress-upsert").length
    : -1;
});

console.log(
  JSON.stringify(
    {
      loggedIn: {
        initialSaved: savedEpisodeOne.data?.find(
          (entry) => entry.episodeNumber === 1,
        )?.currentTime,
        resumeAfterReload,
        resumeAfterNavigation,
        afterTranslationSwitch,
        episodeOneReturn,
        episodeTwoReturn,
        fallbackResume,
        writesDuringMinute,
        finalProgress: finalProgress.data.map((entry) => ({
          episodeNumber: entry.episodeNumber,
          currentTime: entry.currentTime,
        })),
        completed: completedProgress.data.find(
          (entry) => entry.episodeNumber === 1,
        ),
        completedResumePosition,
        authConsoleErrors,
      },
      guest: {
        playbackCurrentTime: guestCurrentTime,
        writes: guestWrites,
        pendingQueueWrites: guestPendingQueueWrites,
        authConsoleErrors: guestAuthErrors,
      },
    },
    null,
    2,
  ),
);
await guestContext.close();
await context.close();
await browser.close();
