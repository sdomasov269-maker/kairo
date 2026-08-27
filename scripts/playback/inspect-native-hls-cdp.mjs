import { chromium } from "file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const title = await fetch(
  "http://localhost:3000/api/playback/kodik/translations?shikimoriId=53446",
).then((response) => response.json());
const translationId = encodeURIComponent(title.translations[0].id);
const descriptor = await fetch(
  `http://localhost:3000/api/playback/kodik?shikimoriId=53446&episode=1&translationId=${translationId}`,
).then((response) => response.json());
const hlsUrl = descriptor.sources.find(
  (source) => source.protocol === "hls",
).url;

const browser = await chromium.launch({
  headless: false,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
const evidence = { players: [], properties: [], events: [], errors: [] };
await cdp.send("Media.enable");
cdp.on("Media.playerCreated", (event) => evidence.players.push(event));
cdp.on("Media.playerPropertiesChanged", (event) =>
  evidence.properties.push({
    playerId: event.playerId,
    properties: event.properties.map((property) => ({
      name: property.name,
      value: /https?:\/\//.test(property.value)
        ? "[redacted-url]"
        : property.value,
    })),
  }),
);
cdp.on("Media.playerEventsAdded", (event) =>
  evidence.events.push({
    playerId: event.playerId,
    events: event.events.map((item) => ({
      timestamp: item.timestamp,
      value: item.value.replace(/https?:\/\/\S+/g, "[redacted-url]"),
    })),
  }),
);
cdp.on("Media.playerErrorsRaised", (event) => evidence.errors.push(event));

await page.setContent('<video id="cdp-native-hls" muted playsinline></video>');
await page.evaluate((url) => {
  const video = document.querySelector("#cdp-native-hls");
  video.src = url;
  return video.play();
}, hlsUrl);
await page.waitForTimeout(15_000);
const media = await page.locator("#cdp-native-hls").evaluate((video) => ({
  currentTime: video.currentTime,
  readyState: video.readyState,
  networkState: video.networkState,
  srcIsManifest: video.currentSrc.includes("manifest.m3u8"),
  mediaSourceAttached: video.currentSrc.startsWith("blob:"),
  error: video.error
    ? { code: video.error.code, message: video.error.message }
    : null,
}));
process.stdout.write(`${JSON.stringify({ media, evidence }, null, 2)}\n`);
await browser.close();
