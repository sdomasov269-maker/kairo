import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const playbackRequests = [];
page.on("request", (request) => {
  if (request.url().includes("/api/playback/resolve"))
    playbackRequests.push(request.url());
});
await page.goto(
  `${baseUrl}/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1`,
  { waitUntil: "domcontentloaded", timeout: 60_000 },
);
const player = page.locator("[data-testid=kairo-player]");
const frame = player.locator('[aria-label="Видеоплеер Kairo"]');
const video = player.locator("video");
await video.waitFor({ timeout: 60_000 });
await page.waitForFunction(
  () => document.querySelector("video")?.duration > 0,
  null,
  { timeout: 60_000 },
);
await video.evaluate((element) => {
  element.currentTime = 20;
});

await player.getByRole("button", { name: "Воспроизвести" }).last().click();
await page.waitForFunction(
  () => document.querySelector("video")?.currentTime > 0.5,
  null,
  { timeout: 30_000 },
);

const seekResult = async (action) => {
  const before = await video.evaluate((element) => element.currentTime);
  await action();
  await page.waitForTimeout(180);
  const after = await video.evaluate((element) => element.currentTime);
  return { before, after, delta: after - before };
};

const bottomBack = await seekResult(() =>
  player.getByRole("button", { name: "Назад на 5 секунд" }).click(),
);
const bottomForward = await seekResult(() =>
  player.getByRole("button", { name: "Вперёд на 5 секунд" }).click(),
);
const bounds = await video.boundingBox();
if (!bounds) throw new Error("Video bounds unavailable");
const doubleLeft = await seekResult(() =>
  page.mouse.dblclick(
    bounds.x + bounds.width * 0.18,
    bounds.y + bounds.height / 2,
  ),
);
const doubleRight = await seekResult(() =>
  page.mouse.dblclick(
    bounds.x + bounds.width * 0.82,
    bounds.y + bounds.height / 2,
  ),
);
await frame.focus();
const keyboardLeft = await seekResult(() => frame.press("ArrowLeft"));
const keyboardRight = await seekResult(() => frame.press("ArrowRight"));

await video.evaluate((element) => {
  element.currentTime = 1;
});
await player.getByRole("button", { name: "Назад на 5 секунд" }).click();
await page.waitForTimeout(100);
const clampBeginning = await video.evaluate((element) => element.currentTime);
await video.evaluate((element) => {
  element.currentTime = element.duration - 1;
});
await player.getByRole("button", { name: "Вперёд на 5 секунд" }).click();
await page.waitForTimeout(100);
const clampEnd = await video.evaluate((element) => ({
  currentTime: element.currentTime,
  duration: element.duration,
}));
const feedbackVisible = await player.getByTestId("seek-feedback").isVisible();
const autonext = page.getByTestId("autonext");
if (await autonext.isVisible())
  await autonext.getByRole("button", { name: "Отмена" }).click({ force: true });

const timeline = player.getByLabel("Позиция воспроизведения");
const timelineBounds = await timeline.boundingBox();
if (!timelineBounds) throw new Error("Timeline bounds unavailable");
await page.mouse.move(
  timelineBounds.x + timelineBounds.width / 2,
  timelineBounds.y + timelineBounds.height / 2,
);
const timelinePreview = {
  visible: await player.getByTestId("timeline-preview").isVisible(),
  value: await player.getByTestId("timeline-preview").textContent(),
};

await video.evaluate((element) => {
  element.currentTime = 20;
});
await frame.focus();
await frame.press("ArrowUp");
await frame.press("ArrowDown");
const keyboardVolume = await video.evaluate((element) => element.volume);

await video.evaluate((element) => {
  element.currentTime = 20;
});
await video.evaluate((element) => element.play());
await page.waitForTimeout(300);
if (await autonext.isVisible())
  await autonext.getByRole("button", { name: "Отмена" }).click({ force: true });
await video.evaluate((element) => element.pause());

const settingsButton = player.getByRole("button", { name: "Настройки" });
await settingsButton.click({ force: true });
const settingsMain = {
  quality: await player.getByRole("button", { name: /Качество/ }).isVisible(),
  speed: await player.getByRole("button", { name: /Скорость/ }).isVisible(),
  subtitlesDisabled: await player
    .getByRole("button", { name: /Субтитры/ })
    .isDisabled(),
};
await player.getByRole("button", { name: /Скорость/ }).click({ force: true });
await player
  .getByRole("menuitemradio", { name: "1.5x" })
  .click({ force: true });
const speedRate = await video.evaluate((element) => element.playbackRate);
await page.keyboard.press("Escape");
const escapeClosed = !(await player.getByRole("menu").isVisible());
await settingsButton.click({ force: true });
await video.click({ force: true, position: { x: 12, y: 12 } });
const outsideClickClosed = !(await player.getByRole("menu").isVisible());

const popoverBounds = async (submenu) => {
  await frame.dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: 20,
    clientY: 20,
  });
  await page.waitForTimeout(80);
  await settingsButton.click({ force: true });
  if (submenu)
    await player
      .getByRole("button", { name: new RegExp(submenu) })
      .click({ force: true });
  await page.waitForTimeout(180);
  const result = await frame.evaluate((element) => {
    const root = element.getBoundingClientRect();
    const menu = element
      .querySelector('[role="menu"]')
      ?.getBoundingClientRect();
    if (!menu) return null;
    return {
      root: root.toJSON(),
      menu: menu.toJSON(),
      inside:
        menu.left >= root.left &&
        menu.right <= root.right &&
        menu.top >= root.top &&
        menu.bottom <= root.bottom,
    };
  });
  await page.keyboard.press("Escape");
  return result;
};
const desktopPopover = await popoverBounds();
await video.evaluate((element) => element.play());
await settingsButton.click({ force: true });
await page.waitForTimeout(3_200);
const menuAutoHideProtection = {
  menuVisible: await player.getByRole("menu").isVisible(),
  controlsVisible: await frame.getAttribute("data-controls-visible"),
};
await page.keyboard.press("Escape");

const beforeFullscreen = await video.evaluate((element) => {
  const root = element.parentElement;
  const rootBounds = root.getBoundingClientRect();
  const videoBounds = element.getBoundingClientRect();
  return {
    viewport: [innerWidth, innerHeight],
    client: [
      document.documentElement.clientWidth,
      document.documentElement.clientHeight,
    ],
    root: rootBounds.toJSON(),
    video: videoBounds.toJSON(),
  };
});
await player
  .getByRole("button", { name: "Полноэкранный режим" })
  .click({ force: true });
await page.waitForTimeout(500);
const fullscreenPopover = await popoverBounds();
const fullscreenNavigator = await frame.evaluate((element) => {
  const root = element.getBoundingClientRect();
  const navigator = element
    .querySelector('[data-testid="episode-navigator"]')
    ?.getBoundingClientRect();
  if (!navigator) return null;
  return {
    navigator: navigator.toJSON(),
    inside:
      navigator.left >= root.left &&
      navigator.right <= root.right &&
      navigator.top >= root.top &&
      navigator.bottom <= root.bottom,
  };
});
const afterFullscreen = await video.evaluate((element) => {
  const root = element.parentElement;
  const rootBounds = root.getBoundingClientRect();
  const videoBounds = element.getBoundingClientRect();
  const style = getComputedStyle(root);
  return {
    active: document.fullscreenElement === root,
    viewport: [innerWidth, innerHeight],
    client: [
      document.documentElement.clientWidth,
      document.documentElement.clientHeight,
    ],
    root: rootBounds.toJSON(),
    video: videoBounds.toJSON(),
    gaps: {
      left: videoBounds.left - rootBounds.left,
      right: rootBounds.right - videoBounds.right,
      top: videoBounds.top - rootBounds.top,
      bottom: rootBounds.bottom - videoBounds.bottom,
    },
    style: {
      border: style.border,
      borderRadius: style.borderRadius,
      aspectRatio: style.aspectRatio,
    },
  };
});
await page.waitForTimeout(3_200);
const fullscreenIdle = await frame.evaluate((element) => ({
  controlsVisible: element.dataset.controlsVisible,
  cursor: getComputedStyle(element).cursor,
}));
await page.mouse.move(400, 300);
await page.waitForTimeout(150);
const fullscreenAfterMove = await frame.getAttribute("data-controls-visible");
await player
  .getByRole("button", { name: "Выйти из полноэкранного режима" })
  .click({ force: true });

const levelCount = Number(await player.getAttribute("data-hls-level-count"));
const subtitleTrackCount = Number(
  await player.getAttribute("data-subtitle-track-count"),
);
await settingsButton.click({ force: true });
await player.getByRole("button", { name: /Качество/ }).click({ force: true });
const qualityOptionCount = await player.getByRole("menuitemradio").count();
await page.keyboard.press("Escape");
await settingsButton.click({ force: true });
const subtitleButtonCount = await player
  .getByRole("button", { name: /Субтитры/ })
  .count();
await page.keyboard.press("Escape");
const pipButton = player.getByRole("button", { name: "Картинка в картинке" });
const pipSupported = (await pipButton.count()) > 0;
let pipWorks = null;
if (pipSupported) {
  await pipButton.click({ force: true });
  await page.waitForTimeout(400);
  pipWorks = await video.evaluate(
    () => document.pictureInPictureElement instanceof HTMLVideoElement,
  );
  if (pipWorks) await page.evaluate(() => document.exitPictureInPicture());
}

const inspectLayout = () =>
  frame.evaluate((element) => {
    const visibleControls = [
      ...element.querySelectorAll("button, input, output"),
    ]
      .filter((control) => getComputedStyle(control).display !== "none")
      .map((control) => {
        const rect = control.getBoundingClientRect();
        return {
          name:
            control.getAttribute("aria-label") || control.textContent.trim(),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      });
    const overlaps = [];
    for (let left = 0; left < visibleControls.length; left += 1)
      for (let right = left + 1; right < visibleControls.length; right += 1) {
        const a = visibleControls[left];
        const b = visibleControls[right];
        if (
          Math.max(a.left, b.left) < Math.min(a.right, b.right) &&
          Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom)
        )
          overlaps.push([a.name, b.name]);
      }
    return {
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      overlaps,
      controls: visibleControls,
    };
  });
const desktopLayout = await inspectLayout();
await page.setViewportSize({ width: 820, height: 900 });
await page.waitForTimeout(300);
const tabletLayout = await inspectLayout();
const tabletPopover = await popoverBounds();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const mobileLayout = await inspectLayout();
const mobilePopover = await popoverBounds();
const mobileQualityPopover = await popoverBounds("Качество");
const mobileSpeedPopover = await popoverBounds("Скорость");

const navigator = player.getByTestId("episode-navigator");
const previousButton = navigator.getByRole("button", {
  name: "Предыдущая серия",
});
const nextButton = navigator.getByRole("button", { name: "Следующая серия" });
const navigationBefore = {
  label: await navigator.textContent(),
  previousDisabled: await previousButton.isDisabled(),
  nextDisabled: await nextButton.isDisabled(),
};
const requestsBeforeNext = playbackRequests.length;
await nextButton.click({ force: true });
await nextButton.click({ force: true, timeout: 500 }).catch(() => undefined);
await page.waitForFunction(
  () => new URL(location.href).searchParams.get("episode") !== "1",
  null,
  { timeout: 60_000 },
);
await page.waitForFunction(
  () => document.querySelector("video")?.duration > 0,
  null,
  { timeout: 60_000 },
);
const navigationAfterNext = {
  label: await navigator.textContent(),
  url: page.url(),
  resolveRequests: playbackRequests.length - requestsBeforeNext,
  previousDisabled: await previousButton.isDisabled(),
};
await previousButton.click({ force: true });
await page.waitForFunction(
  () => new URL(location.href).searchParams.get("episode") === "1",
  null,
  { timeout: 60_000 },
);
const navigationAfterPrevious = {
  label: await navigator.textContent(),
  url: page.url(),
  previousDisabled: await previousButton.isDisabled(),
};
await page.goto(
  `${baseUrl}/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=12`,
  { waitUntil: "domcontentloaded", timeout: 60_000 },
);
await page.getByTestId("episode-navigator").waitFor({ timeout: 60_000 });
const lastEpisodeProtection = {
  label: await page.getByTestId("episode-navigator").textContent(),
  nextDisabled: await page
    .getByTestId("episode-navigator")
    .getByRole("button", { name: "Следующая серия" })
    .isDisabled(),
};

console.log(
  JSON.stringify(
    {
      seek: {
        bottomBack,
        bottomForward,
        doubleLeft,
        doubleRight,
        keyboardLeft,
        keyboardRight,
        clampBeginning,
        clampEnd,
        feedbackVisible,
      },
      keyboardVolume,
      settings: {
        main: settingsMain,
        speedRate,
        escapeClosed,
        outsideClickClosed,
        menuAutoHideProtection,
        popovers: {
          desktop: desktopPopover,
          tablet: tabletPopover,
          mobile: mobilePopover,
          mobileQuality: mobileQualityPopover,
          mobileSpeed: mobileSpeedPopover,
          fullscreen: fullscreenPopover,
        },
      },
      episodeNavigation: {
        before: navigationBefore,
        afterNext: navigationAfterNext,
        afterPrevious: navigationAfterPrevious,
        lastEpisodeProtection,
      },
      timelinePreview,
      fullscreen: {
        before: beforeFullscreen,
        after: afterFullscreen,
        idle: fullscreenIdle,
        afterMove: fullscreenAfterMove,
        navigator: fullscreenNavigator,
      },
      capabilities: {
        levelCount,
        qualityOptionCount,
        subtitleTrackCount,
        subtitleButtonCount,
        pipSupported,
        pipWorks,
      },
      desktopLayout,
      tabletLayout,
      mobileLayout,
    },
    null,
    2,
  ),
);
await browser.close();
