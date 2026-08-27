import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
if (process.argv.includes("--force-hlsjs")) {
  await page.addInitScript(() => {
    const nativeCanPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type) {
      return type === "application/vnd.apple.mpegurl"
        ? ""
        : nativeCanPlayType.call(this, type);
    };
  });
}
const network = {
  manifest: 0,
  segments: 0,
  mp4: 0,
  rangeRequests: 0,
  corsResponses: 0,
  failures: [],
};
const hlsObservationWindows = Number(
  process.env.KAIRO_HLS_OBSERVATION_WINDOWS || 12,
);

page.on("request", (request) => {
  const url = request.url();
  const resource = request.resourceType();
  if (request.headers().range) network.rangeRequests += 1;
  if (url.includes("manifest.m3u8")) network.manifest += 1;
  else if (url.includes(":hls:seg-") || /\.ts(?:\?|$)/.test(url))
    network.segments += 1;
  else if (resource === "media" || /\.mp4(?:\?|$)/.test(url)) network.mp4 += 1;
});
page.on("response", (response) => {
  const url = response.url();
  if (
    (url.includes("manifest.m3u8") ||
      url.includes(":hls:seg-") ||
      /\.mp4(?:\?|$)/.test(url)) &&
    response.headers()["access-control-allow-origin"] === "*"
  ) {
    network.corsResponses += 1;
  }
});
page.on("requestfailed", (request) => {
  const url = request.url();
  if (
    url.includes("manifest.m3u8") ||
    url.includes(":hls:seg-") ||
    /\.mp4(?:\?|$)/.test(url)
  ) {
    network.failures.push(
      request.failure()?.errorText ?? "unknown media request failure",
    );
  }
});

const snapshot = async () =>
  page.locator("video").evaluate((video) => {
    let bufferAhead = 0;
    const buffered = [];
    for (let index = 0; index < video.buffered.length; index += 1) {
      const start = video.buffered.start(index);
      const end = video.buffered.end(index);
      buffered.push([start, end]);
      if (start <= video.currentTime && end >= video.currentTime)
        bufferAhead = end - video.currentTime;
    }
    return {
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      error: video.error
        ? { code: video.error.code, message: video.error.message }
        : null,
      readyState: video.readyState,
      networkState: video.networkState,
      buffered,
      bufferAhead,
    };
  });

const stalls = async () =>
  page
    .locator("section")
    .filter({ hasText: "Stall observations" })
    .locator("li")
    .allTextContents();
const telemetry = async () =>
  page
    .getByTestId("telemetry")
    .locator("div")
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows.map((row) => [
          row.querySelector("dt")?.textContent ?? "",
          row.querySelector("dd")?.textContent ?? "",
        ]),
      ),
    );
const waitProgress = async (seconds) => {
  const before = await snapshot();
  await page.waitForTimeout(seconds * 1000);
  const after = await snapshot();
  return {
    before,
    after,
    advanced: after.currentTime > before.currentTime + seconds * 0.45,
  };
};
const seekForward = async (seconds) => {
  const before = await snapshot();
  const timeline = page.getByLabel("Timeline");
  const box = await timeline.boundingBox();
  if (!box || !before.duration) throw new Error("Timeline is not measurable");
  const target = Math.min(before.duration, before.currentTime + seconds);
  await timeline.click({
    position: {
      x: Math.max(
        1,
        Math.min(box.width - 1, (box.width * target) / before.duration),
      ),
      y: box.height / 2,
    },
  });
};
const ensurePlaying = async (player) => {
  if ((await snapshot()).paused) await player.locator("button").first().click();
};

const result = { hls: {}, mp4: {}, network, fullscreen: {}, consoleErrors: [] };
page.on("console", (message) => {
  if (message.type() === "error")
    result.consoleErrors.push(
      message.text().replace(/https?:\/\/\S+/g, "[redacted-url]"),
    );
});

try {
  await page.goto("http://localhost:3000/debug/kodik-player", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_000);
  await page.locator("video").evaluate((video) => {
    const events = { stalled: 0, waiting: 0 };
    const frames = [];
    video.addEventListener("stalled", () => {
      events.stalled += 1;
    });
    video.addEventListener("waiting", () => {
      events.waiting += 1;
    });
    if (typeof video.requestVideoFrameCallback === "function") {
      const onFrame = (now, metadata) => {
        frames.push({
          now,
          mediaTime: metadata.mediaTime,
          presentedFrames: metadata.presentedFrames,
        });
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    }
    window.__kairoAcceptance = { events, frames };
  });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/playback/kodik/translations") &&
        response.status() === 200,
    ),
    page.getByRole("button", { name: "Load translations" }).click(),
  ]);
  await page
    .locator("select")
    .filter({ has: page.locator("option") })
    .first()
    .waitFor();
  await page
    .getByText(/12 episodes · 13 translations/)
    .waitFor({ timeout: 30_000 });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/playback/kodik?") &&
        response.status() === 200,
    ),
    page.getByRole("button", { name: "Resolve playback" }).click(),
  ]);
  await page.getByText("Descriptor resolved").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
    null,
    { timeout: 30_000 },
  );
  const player = page.getByTestId("kairo-player");
  await ensurePlaying(player);
  result.hls.initialProgress = await waitProgress(12);
  await player.getByRole("button", { name: "Pause", exact: true }).click();
  const pauseStart = await snapshot();
  await page.waitForTimeout(2_000);
  const pauseEnd = await snapshot();
  result.hls.pause = {
    before: pauseStart.currentTime,
    after: pauseEnd.currentTime,
    held: Math.abs(pauseEnd.currentTime - pauseStart.currentTime) < 0.25,
  };
  await ensurePlaying(player);
  result.hls.resumeProgress = await waitProgress(5);
  const hlsBeforeSeek = await snapshot();
  await seekForward(45);
  await page.waitForFunction(
    (minimum) => (document.querySelector("video")?.currentTime ?? 0) >= minimum,
    hlsBeforeSeek.currentTime + 35,
    { timeout: 10_000 },
  );
  result.hls.seekProgress = await waitProgress(12);
  for (let index = 0; index < hlsObservationWindows; index += 1) {
    await page.waitForTimeout(10_000);
    const sample = await snapshot();
    process.stdout.write(
      `HLS_OBSERVATION_${index + 1} time=${sample.currentTime.toFixed(2)} ready=${sample.readyState} ahead=${sample.bufferAhead.toFixed(2)}\n`,
    );
  }
  result.hls.final = await snapshot();
  result.hls.telemetry = await telemetry();
  result.hls.stalls = await stalls();
  result.hls.frames = await page.locator("video").evaluate((video) => {
    const diagnostics = window.__kairoAcceptance;
    const gaps = diagnostics.frames.slice(1).map((frame, index) => ({
      wallGapMs: frame.now - diagnostics.frames[index].now,
      mediaGapMs:
        (frame.mediaTime - diagnostics.frames[index].mediaTime) * 1000,
      atMediaTime: frame.mediaTime,
    }));
    const steadyGaps = gaps.filter(
      (gap) => gap.atMediaTime > 1 && Math.abs(gap.mediaGapMs) < 500,
    );
    const quality = video.getVideoPlaybackQuality?.();
    return {
      events: diagnostics.events,
      largestFrameGapMs: Math.max(0, ...steadyGaps.map((gap) => gap.wallGapMs)),
      largestGaps: steadyGaps
        .sort((left, right) => right.wallGapMs - left.wallGapMs)
        .slice(0, 5),
      totalVideoFrames: quality?.totalVideoFrames ?? null,
      droppedVideoFrames: quality?.droppedVideoFrames ?? null,
    };
  });

  await page.getByLabel("Source").selectOption("mp4");
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("dt")).some(
        (item) =>
          item.textContent === "protocol" &&
          item.nextElementSibling?.textContent === "mp4",
      ),
    null,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
    null,
    { timeout: 30_000 },
  );
  await ensurePlaying(player);
  result.mp4.initialProgress = await waitProgress(12);
  await player.getByRole("button", { name: "Pause", exact: true }).click();
  const mp4PauseStart = await snapshot();
  await page.waitForTimeout(2_000);
  const mp4PauseEnd = await snapshot();
  result.mp4.pause = {
    before: mp4PauseStart.currentTime,
    after: mp4PauseEnd.currentTime,
    held: Math.abs(mp4PauseEnd.currentTime - mp4PauseStart.currentTime) < 0.25,
  };
  await ensurePlaying(player);
  const mp4BeforeSeek = await snapshot();
  await seekForward(45);
  await page.waitForFunction(
    (minimum) => (document.querySelector("video")?.currentTime ?? 0) >= minimum,
    mp4BeforeSeek.currentTime + 35,
    { timeout: 10_000 },
  );
  result.mp4.seekProgress = await waitProgress(12);
  for (let index = 0; index < 3; index += 1) {
    await page.waitForTimeout(10_000);
    const sample = await snapshot();
    process.stdout.write(
      `MP4_OBSERVATION_${index + 1} time=${sample.currentTime.toFixed(2)} ready=${sample.readyState} ahead=${sample.bufferAhead.toFixed(2)}\n`,
    );
  }
  result.mp4.final = await snapshot();
  result.mp4.telemetry = await telemetry();
  result.mp4.stalls = await stalls();

  await player.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await page.waitForTimeout(1_000);
  result.fullscreen.entered = await page.evaluate(() =>
    Boolean(document.fullscreenElement),
  );
  if (result.fullscreen.entered) await page.keyboard.press("Escape");
} catch (error) {
  result.testError =
    error instanceof Error
      ? error.message.replace(/https?:\/\/\S+/g, "[redacted-url]")
      : String(error);
} finally {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}
