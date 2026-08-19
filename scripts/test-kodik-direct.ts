import { VideoLinks, type KodikVideoLinks } from "kodikwrapper";
import { canonicalizeKodikPlayerLink } from "../src/server/playback/providers/kodik-link";

const link = process.argv[2];
if (!link) {
  console.error('Usage: npx tsx scripts/test-kodik-direct.ts "<kodik-player-url>"');
  process.exitCode = 1;
} else {
  const timeoutMs = 8_000;
  const mask = (input: string | URL) => {
    const url = new URL(input.toString());
    const parts = url.pathname.split("/").filter(Boolean);
    return `${url.origin}/${parts.slice(0, 2).join("/")}${parts.length > 2 ? "/…" : ""}`;
  };
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      console.info("HTTP", { url: mask(input instanceof Request ? input.url : input), status: response.status, contentType: response.headers.get("content-type"), redirected: response.redirected });
      return response;
    } finally { clearTimeout(timeout); }
  };
  const run = async () => {
    const normalized = VideoLinks.normalizeKodikLink(link);
    const canonical = canonicalizeKodikPlayerLink(normalized);
    console.info("original URL", { url: mask(normalized) });
    console.info("canonical URL", { url: mask(canonical), host: "kodikplayer.com" });
    const basic = await VideoLinks.parseLink({ link: normalized, fetcher });
    console.info("parseLink basic", { status: "OK", host: basic.host, type: basic.type, id: basic.id, quality: basic.quality });
    const extended = await VideoLinks.parseLink({ link: canonical, extended: true, fetcher });
    console.info("extended parse", { status: "OK", translation: extended.ex.translation.title, hasPlayerSingleUrl: Boolean(extended.ex.playerSingleUrl) });
    if (!extended.ex.playerSingleUrl) throw new Error("playerSingleUrl is missing");
    console.info("playerSingleUrl", { value: extended.ex.playerSingleUrl });
    const playerSingleUrl = VideoLinks.normalizeKodikLink(extended.ex.playerSingleUrl, "kodikplayer.com");
    console.info("resolved player chunk URL", { url: mask(playerSingleUrl) });
    const endpoint = await VideoLinks.getActualVideoInfoEndpoint(playerSingleUrl, fetcher);
    console.info("detected videoInfo endpoint", { endpoint });
    const links: KodikVideoLinks = await VideoLinks.getLinks({ link: canonical, videoInfoEndpoint: endpoint, fetcher });
    const qualities = Object.entries(links).filter(([, sources]) => sources.length > 0).map(([quality]) => quality);
    console.info("getLinks result", { status: "OK" });
    console.info("available qualities", Object.fromEntries(qualities.map((quality) => [quality, "resolved"])));
  };
  run().catch((error: unknown) => {
    const value = error as { code?: unknown; data?: { videoInfoResponse?: Response }; cause?: unknown };
    const response = value.data?.videoInfoResponse;
    console.error("direct HLS failed", {
      message: error instanceof Error ? error.message : String(error),
      code: value.code,
      cause: value.cause instanceof Error ? value.cause.message : value.cause,
      status: response?.status,
      contentType: response?.headers.get("content-type"),
    });
    process.exitCode = 1;
  });
}
