import { strict as assert } from "node:assert";
import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.KAIRO_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];

try {
  for (const route of [
    "/",
    "/catalog",
    "/anime/cowboy-bebop",
    "/watch/cowboy-bebop/1",
    "/profile",
    "/settings",
  ]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    const header = page.locator("header.site-header");
    await header.waitFor({ state: "visible" });
    assert.equal(await page.locator(".locale-switch").isVisible(), true);
    await page.waitForTimeout(500);
    await header.evaluate((element) =>
      element.setAttribute("data-acceptance-node", "persistent"),
    );

    for (const scrollTarget of [0, 100, 500, "bottom", 0]) {
      await page.evaluate((value) => {
        const top = value === "bottom" ? document.documentElement.scrollHeight : value;
        window.scrollTo(0, top);
      }, scrollTarget);
      await page.waitForTimeout(80);
      assert.equal(await header.isVisible(), true);
      assert.equal(
        await header.getAttribute("data-acceptance-node"),
        "persistent",
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    const routeBefore = new URL(page.url()).pathname;
    await page.getByRole("button", { name: "Українська" }).click();
    assert.equal(new URL(page.url()).pathname, routeBefore);
    assert.equal(await page.locator("html").getAttribute("lang"), "uk");
    assert.equal(await header.isVisible(), true);
    await page.getByRole("button", { name: "English" }).click();
    assert.equal(new URL(page.url()).pathname, routeBefore);
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(await header.isVisible(), true);
    await page.getByRole("button", { name: "Русский" }).click();
    assert.equal(new URL(page.url()).pathname, routeBefore);
    assert.equal(await page.locator("html").getAttribute("lang"), "ru");

    results.push({ route, header: "PASS", locale: "PASS", scroll: "PASS" });
  }

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Поиск", exact: true }).click();
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  assert.equal(await page.locator("header.site-header").isVisible(), true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Профиль", exact: true }).click();
  assert.equal(await page.locator("#account-menu-panel").isVisible(), true);

  for (const [width, height] of [
    [390, 844],
    [430, 932],
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.locator("header.site-header").isVisible(), true);
    assert.equal(await page.locator(".locale-switch").isVisible(), true);
    assert.equal(
      await page.getByRole("button", { name: "Профиль" }).isVisible(),
      true,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      true,
    );
  }

  console.log(
    JSON.stringify(
      { results, interactions: "PASS", responsive: "PASS" },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
