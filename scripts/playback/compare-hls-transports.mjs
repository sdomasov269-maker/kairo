import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const hlsScriptPath = "D:/ANIME/node_modules/hls.js/dist/hls.min.js";
const observationSeconds = Number(process.env.KAIRO_HLS_COMPARE_SECONDS || 75);

const browser = await chromium.launch({
  headless: false,
  executablePath: chromePath,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function run(mode) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  if (mode === "mse") {
    await page.addInitScript(() => {
      const nativeCanPlayType = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function (type) {
        return type === "application/vnd.apple.mpegurl"
          ? ""
          : nativeCanPlayType.call(this, type);
      };
    });
  }
  const segments = [];
  let manifestRequests = 0;
  let segmentRequests = 0;
  page.on("request", async (request) => {
    const url = request.url();
    if (url.includes("manifest.m3u8")) manifestRequests += 1;
    if (url.includes(":hls:seg-") || /\.ts(?:\?|$)/.test(url)) {
      segmentRequests += 1;
      const state = await page
        .locator("video")
        .evaluate((video) => ({
          at: performance.now(),
          currentTime: video.currentTime,
        }))
        .catch(() => null);
      if (state) segments.push(state);
    }
  });

  await page.goto("http://localhost:3000/debug/kodik-player", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_000);
  const rawCapabilities = await page.locator("video").evaluate((video) => ({
    userAgent: navigator.userAgent,
    vendor: navigator.vendor,
    platform: navigator.platform,
    appleWebKit: /AppleWebKit/.test(navigator.userAgent),
    chrome: /Chrome\//.test(navigator.userAgent),
    safari:
      /Safari\//.test(navigator.userAgent) &&
      !/Chrome\//.test(navigator.userAgent),
    hlsApple: video.canPlayType("application/vnd.apple.mpegurl"),
    hlsMpeg: video.canPlayType("application/x-mpegURL"),
    mediaSource: typeof MediaSource !== "undefined",
    managedMediaSource: typeof window.ManagedMediaSource !== "undefined",
    mseAvcAac:
      typeof MediaSource !== "undefined" &&
      MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'),
    playbackQuality: typeof video.getVideoPlaybackQuality === "function",
    videoFrameCallback: typeof video.requestVideoFrameCallback === "function",
  }));
  await page.addScriptTag({ path: hlsScriptPath });
  const hlsIsSupported = await page.evaluate(() => window.Hls.isSupported());

  await page.locator("video").evaluate((video) => {
    const events = [];
    const stallSamples = [];
    const frameCallbacks = [];
    const quality = () => {
      const value =
        typeof video.getVideoPlaybackQuality === "function"
          ? video.getVideoPlaybackQuality()
          : null;
      return value
        ? {
            totalVideoFrames: value.totalVideoFrames,
            droppedVideoFrames: value.droppedVideoFrames,
          }
        : null;
    };
    const ahead = () => {
      for (let index = 0; index < video.buffered.length; index += 1) {
        if (
          video.buffered.start(index) <= video.currentTime &&
          video.buffered.end(index) >= video.currentTime
        )
          return video.buffered.end(index) - video.currentTime;
      }
      return 0;
    };
    const capture = (event) =>
      events.push({
        event: event.type,
        at: performance.now(),
        currentTime: video.currentTime,
        readyState: video.readyState,
        networkState: video.networkState,
        bufferAhead: ahead(),
        quality: quality(),
      });
    for (const name of [
      "stalled",
      "waiting",
      "progress",
      "suspend",
      "canplay",
      "canplaythrough",
      "timeupdate",
      "playing",
      "pause",
      "seeking",
      "seeked",
    ])
      video.addEventListener(name, capture);
    video.addEventListener("stalled", () => {
      const record = { at: performance.now(), samples: [] };
      stallSamples.push(record);
      for (const delay of [0, 100, 250, 500, 1000])
        setTimeout(
          () =>
            record.samples.push({
              delay,
              at: performance.now(),
              currentTime: video.currentTime,
              readyState: video.readyState,
              networkState: video.networkState,
              bufferAhead: ahead(),
              quality: quality(),
            }),
          delay,
        );
    });
    if (typeof video.requestVideoFrameCallback === "function") {
      const frame = (now, metadata) => {
        frameCallbacks.push({
          now,
          mediaTime: metadata.mediaTime,
          presentedFrames: metadata.presentedFrames,
        });
        video.requestVideoFrameCallback(frame);
      };
      video.requestVideoFrameCallback(frame);
    }
    window.__hlsComparison = { events, stallSamples, frameCallbacks };
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
    .getByText(/12 episodes · 13 translations/)
    .waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const select = Array.from(document.querySelectorAll("select")).find(
      (item) => item.closest("label")?.textContent?.includes("Translation"),
    );
    return Boolean(select?.value);
  });
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/playback/kodik?") &&
        response.status() === 200,
    ),
    page.getByRole("button", { name: "Resolve playback", exact: true }).click(),
  ]);
  await page.getByText("Descriptor resolved").waitFor({ timeout: 30_000 });
  const player = page.getByTestId("kairo-player");
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
    null,
    { timeout: 30_000 },
  );
  if (await page.locator("video").evaluate((video) => video.paused))
    await player.locator("button").first().click();
  await page.waitForTimeout(12_000);
  const beforeSeek = await page.locator("video").evaluate((video) => ({
    currentTime: video.currentTime,
    duration: video.duration,
  }));
  const timeline = page.getByLabel("Timeline");
  const box = await timeline.boundingBox();
  if (!box) throw new Error("Timeline is not measurable");
  const target = Math.min(beforeSeek.duration, beforeSeek.currentTime + 45);
  await timeline.click({
    position: {
      x: Math.max(
        1,
        Math.min(box.width - 1, (box.width * target) / beforeSeek.duration),
      ),
      y: box.height / 2,
    },
  });
  await page.waitForTimeout(observationSeconds * 1000);
  await page.waitForTimeout(1_100);

  const result = await page.locator("video").evaluate((video) => {
    const diagnostics = window.__hlsComparison;
    const frames = diagnostics.frameCallbacks;
    let finalBufferAhead = 0;
    for (let index = 0; index < video.buffered.length; index += 1) {
      if (
        video.buffered.start(index) <= video.currentTime &&
        video.buffered.end(index) >= video.currentTime
      )
        finalBufferAhead = video.buffered.end(index) - video.currentTime;
    }
    const frameGaps = frames.slice(1).map((frame, index) => ({
      wallGapMs: frame.now - frames[index].now,
      mediaGapMs: (frame.mediaTime - frames[index].mediaTime) * 1000,
      atMediaTime: frame.mediaTime,
    }));
    const quality =
      typeof video.getVideoPlaybackQuality === "function"
        ? video.getVideoPlaybackQuality()
        : null;
    return {
      final: {
        currentTime: video.currentTime,
        readyState: video.readyState,
        networkState: video.networkState,
        bufferAhead: finalBufferAhead,
        paused: video.paused,
        error: video.error
          ? { code: video.error.code, message: video.error.message }
          : null,
      },
      events: diagnostics.events,
      stallSamples: diagnostics.stallSamples,
      frames: {
        count: frames.length,
        largestWallGapMs: Math.max(0, ...frameGaps.map((gap) => gap.wallGapMs)),
        largestMediaGapMs: Math.max(
          0,
          ...frameGaps.map((gap) => gap.mediaGapMs),
        ),
        largestGaps: frameGaps
          .sort((a, b) => b.wallGapMs - a.wallGapMs)
          .slice(0, 10),
      },
      quality: quality
        ? {
            totalVideoFrames: quality.totalVideoFrames,
            droppedVideoFrames: quality.droppedVideoFrames,
          }
        : null,
    };
  });
  const eventCounts = Object.fromEntries(
    Object.entries(
      result.events.reduce(
        (counts, event) => ({
          ...counts,
          [event.event]: (counts[event.event] || 0) + 1,
        }),
        {},
      ),
    ).sort(),
  );
  const classifiedStalls = result.stallSamples.map((stall) => {
    const first =
      stall.samples.find((sample) => sample.delay === 0) || stall.samples[0];
    const last =
      stall.samples.find((sample) => sample.delay === 1000) ||
      stall.samples.at(-1);
    const delta = first && last ? last.currentTime - first.currentTime : 0;
    return {
      ...stall,
      classification: delta >= 0.7 ? "STALLED_EVENT_ONLY" : "PLAYBACK_FREEZE",
      deltaCurrentTime1000ms: delta,
    };
  });
  await page.close();
  return {
    mode,
    capabilities: { ...rawCapabilities, hlsIsSupported },
    manifestRequests,
    segmentRequests,
    segmentDurationSeconds: 6,
    segmentRequestTimes: segments.map((segment) => ({
      ...segment,
      distanceToSixSecondBoundary:
        Math.abs(
          segment.currentTime / 6 - Math.round(segment.currentTime / 6),
        ) * 6,
    })),
    eventCounts,
    classifiedStalls,
    ...result,
  };
}

try {
  const selectedMode = process.argv
    .find((argument) => argument.startsWith("--mode="))
    ?.split("=")[1];
  if (selectedMode === "mse" || selectedMode === "native") {
    const result = await run(selectedMode);
    process.stdout.write(
      `${JSON.stringify({ [selectedMode]: result }, null, 2)}\n`,
    );
  } else {
    const native = await run("native");
    process.stdout.write(
      `NATIVE_COMPLETE stalls=${native.eventCounts.stalled || 0} time=${native.final.currentTime.toFixed(2)}\n`,
    );
    const mse = await run("mse");
    process.stdout.write(`${JSON.stringify({ native, mse }, null, 2)}\n`);
  }
} finally {
  await browser.close();
}
