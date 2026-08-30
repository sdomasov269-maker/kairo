import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const results = {};
const within = (inner, outer) =>
  inner.x >= outer.x - 1 &&
  inner.y >= outer.y - 1 &&
  inner.x + inner.width <= outer.x + outer.width + 1 &&
  inner.y + inner.height <= outer.y + outer.height + 1;

for (const [name, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  tablet: { width: 900, height: 1000 },
  mobile: { width: 390, height: 844 },
})) {
  const page = await browser.newPage({ viewport });
  await page.goto(
    `${baseUrl}/anime/anilist-208044-from-overshadowed-to-overpowered-second-reincarnation-of-a-talentless-sa?episode=1#player`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Выбор озвучки" }).waitFor({ timeout: 60_000 });
  await page.waitForFunction(
    () => document.querySelectorAll('[aria-label="Выбор эпизода"] button').length === 10,
  );
  const brand = page.getByTestId("kairo-player-brand");
  const player = page.getByTestId("kairo-player");
  const brandBox = await brand.boundingBox();
  const playerBox = await player.boundingBox();
  const episodeCenters = await page.locator('[aria-label="Выбор эпизода"] button').evaluateAll(
    (buttons) =>
      buttons.every((button) => {
        const tile = button.getBoundingClientRect();
        const label = button.querySelector("strong")?.getBoundingClientRect();
        return Boolean(
          label &&
            Math.abs(label.x + label.width / 2 - (tile.x + tile.width / 2)) < 1.5 &&
            Math.abs(label.y + label.height / 2 - (tile.y + tile.height / 2)) < 1.5,
        );
      }),
  );
  const trigger = page.getByRole("button", { name: "Выбор озвучки" });
  await trigger.click();
  const menu = page.getByRole("listbox");
  const menuBox = await menu.boundingBox();
  const panelBox = await page.locator("aside[aria-label='Управление просмотром']").boundingBox();
  const selectedStyle = await menu.locator('[aria-selected="true"]').evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, color: style.color };
  });
  await page.keyboard.press("Escape");
  results[name] = {
    episodes: 10,
    brandInside: Boolean(brandBox && playerBox && within(brandBox, playerBox)),
    popoverInsidePanel: Boolean(menuBox && panelBox && within(menuBox, panelBox)),
    episodeCenters,
    selectedStyle,
    menuClosed: !(await menu.isVisible()),
    brandBox,
    playerBox,
    menuBox,
    panelBox,
  };
  await page.screenshot({
    path: `reports/penpot-geometry-${name}.png`,
    fullPage: true,
  });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${baseUrl}/anime/anilist-21355-re-zero-starting-life-in-another-world?episode=1#player`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
const seasonTrigger = page.getByRole("button", { name: "Выбор сезона" });
await seasonTrigger.waitFor({ timeout: 60_000 });
await page.waitForFunction(
  () => document.querySelectorAll('[aria-label="Выбор эпизода"] button').length > 0,
  null,
  { timeout: 60_000 },
);
await page.waitForTimeout(5_000);
await seasonTrigger.click({ force: true });
await page.getByRole("option").first().waitFor({ timeout: 10_000 });
const seasonOptions = await page.getByRole("option").allTextContents();
if (seasonOptions.length < 2)
  throw new Error(
    `Season menu did not open: expanded=${await seasonTrigger.getAttribute("aria-expanded")} html=${await seasonTrigger.evaluate((node) => node.outerHTML)}`,
  );
await page.getByRole("option").nth(1).click();
await page.waitForURL(/anilist-108632.*season=2&episode=1/, { timeout: 60_000 });
await page.waitForFunction(
  () => document.querySelectorAll('[aria-label="Выбор эпизода"] button').length > 0,
  null,
  { timeout: 60_000 },
);
results.seasons = {
  options: seasonOptions,
  count: seasonOptions.length,
  route: page.url(),
  episodeCount: await page.locator('[aria-label="Выбор эпизода"] button').count(),
};

const edgeMetrics = await page.evaluate(() => {
  const right = (node) => node?.getBoundingClientRect().right ?? null;
  const season = document.querySelector('[aria-label="Выбор сезона"]');
  const translation = document.querySelector('[aria-label="Выбор озвучки"]');
  const episodes = document.querySelector('[aria-label="Выбор эпизода"]');
  const actionByText = (text) =>
    [...document.querySelectorAll("span")].find((node) =>
      node.textContent?.includes(text),
    );
  const values = {
    season: right(season),
    episodes: right(episodes),
    translation: right(translation),
    watchParty: right(actionByText("Создать комнату")),
    music: right(actionByText("Подключение скоро")),
  };
  const aligned = Object.values(values).filter(
    (value) => typeof value === "number",
  );
  return {
    ...values,
    spread: Math.max(...aligned) - Math.min(...aligned),
  };
});
results.rightEdges = edgeMetrics;
await page.screenshot({
  path: "reports/penpot-geometry-seasons.png",
  fullPage: true,
});

await page.getByTestId("kairo-player").evaluate((node) => node.requestFullscreen());
await page.waitForFunction(() => Boolean(document.fullscreenElement));
const fullscreenBrand = await page.getByTestId("kairo-player-brand").boundingBox();
const fullscreenPlayer = await page.getByTestId("kairo-player").boundingBox();
results.fullscreen = {
  active: await page.evaluate(() => Boolean(document.fullscreenElement)),
  brandInside: Boolean(
    fullscreenBrand && fullscreenPlayer && within(fullscreenBrand, fullscreenPlayer),
  ),
};
await page.evaluate(() => document.exitFullscreen());

await page.goto(
  `${baseUrl}/anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1#player`,
  { waitUntil: "domcontentloaded", timeout: 60_000 },
);
const translationTrigger = page.locator("#playback-translation");
await page.waitForFunction(
  () => {
    const node = document.querySelector("#playback-translation");
    return node instanceof HTMLButtonElement && !node.disabled;
  },
  null,
  { timeout: 60_000 },
);
await translationTrigger.click();
const initialOptions = await page.getByRole("option").count();
const initialColumns = await page.getByRole("listbox").evaluate(
  (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length,
);
const moreButton = page.getByRole("button", { name: /Показать ещё/ });
const moreVisible = await moreButton.isVisible();
await moreButton.click();
const expandedOptions = await page.getByRole("option").count();
const scrollBefore = await page.getByRole("listbox").evaluate((node) => ({
  top: (node.scrollTop = 0),
  height: node.clientHeight,
  total: node.scrollHeight,
}));
await page.getByRole("listbox").dispatchEvent("wheel", {
  deltaY: 500,
  bubbles: true,
  cancelable: true,
});
await page.waitForTimeout(150);
const scrollAfter = await page.getByRole("listbox").evaluate((node) => node.scrollTop);
await page.getByRole("option").nth(12).click();
const selectedBeyondTen = await translationTrigger.getAttribute("data-value");
await translationTrigger.click();
const collapsedAfterSelection = await page.getByRole("option").count();
await page.getByRole("button", { name: /Показать ещё/ }).click();
const selectedVisibleAfterExpand = await page
  .getByRole("option")
  .filter({ has: page.locator('[aria-hidden="true"]') })
  .count();
await page.keyboard.press("Escape");

const playerRoot = page.getByTestId("kairo-player");
const videoFrame = playerRoot.locator("div").first();
const playerBrand = page.getByTestId("kairo-player-brand");
const controlBrand = playerRoot.locator("span").filter({ hasText: /^kairo\.player$/ }).last();
await videoFrame.hover();
const visibleBrandOpacity = await playerBrand.evaluate((node) => getComputedStyle(node).opacity);
await page.waitForFunction(() => (document.querySelector("video")?.readyState ?? 0) >= 2, null, {
  timeout: 60_000,
});
await playerRoot
  .locator("video")
  .evaluate((video) => video.play().catch(() => undefined));
await page.waitForFunction(() => document.querySelector("video")?.paused === false, null, {
  timeout: 30_000,
});
await page.mouse.move(1400, 50);
await page.waitForTimeout(3_200);
const hiddenBrand = await playerBrand.evaluate((node) => ({
  opacity: getComputedStyle(node).opacity,
  controls: node.closest('[data-controls-visible]')?.getAttribute('data-controls-visible'),
}));
await videoFrame.hover({ position: { x: 50, y: 50 } });
await page.waitForTimeout(250);
const restoredBrandOpacity = await playerBrand.evaluate((node) => getComputedStyle(node).opacity);
const stageLabel = page.getByText("01 / Kairo Watch", { exact: true });
const [badgeBounds, stageBounds, controlBrandBounds, frameBounds] = await Promise.all([
  playerBrand.boundingBox(),
  stageLabel.boundingBox(),
  controlBrand.boundingBox(),
  videoFrame.boundingBox(),
]);
const topBrandExists = Boolean(
  badgeBounds &&
    frameBounds &&
    badgeBounds.y + badgeBounds.height / 2 < frameBounds.y + frameBounds.height / 2,
);
const overlaps = (a, b) =>
  Boolean(
    a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y,
  );
results.compactTranslation = {
  initialOptions,
  initialColumns,
  moreVisible,
  expandedOptions,
  scrollBefore,
  scrollAfter,
  selectedBeyondTen,
  collapsedAfterSelection,
  selectedVisibleAfterExpand,
};
results.brandingPolicy = {
  visibleBrandOpacity,
  hiddenBrand,
  restoredBrandOpacity,
  topBrandExists,
  badgeStageOverlap: overlaps(badgeBounds, stageBounds),
  controlBrandInside: Boolean(controlBrandBounds && frameBounds && within(controlBrandBounds, frameBounds)),
};
await browser.close();
console.log(JSON.stringify(results, null, 2));
