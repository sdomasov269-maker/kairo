import { VideoLinks, type KodikVideoLinks } from "kodikwrapper";

export type DirectPlaybackSource = { quality: string; url: string; mimeType: string };
export type DirectPlaybackResult = { sources: DirectPlaybackSource[] };

export function canonicalizeKodikPlayerLink(link: string): string {
  const normalized = link.startsWith("//") ? `https:${link}` : link;
  const url = new URL(normalized);
  url.protocol = "https:";
  url.host = "kodikplayer.com";
  return url.toString();
}

function normalizeSources(links: KodikVideoLinks): DirectPlaybackSource[] {
  return Object.entries(links)
    .flatMap(([quality, entries]) => entries.flatMap((entry) =>
      typeof entry.src === "string" && entry.src
        ? [{ quality, url: entry.src.startsWith("//") ? `https:${entry.src}` : entry.src, mimeType: entry.type || "application/x-mpegURL" }]
        : [],
    ))
    .sort((left, right) => Number(right.quality) - Number(left.quality));
}

export class KodikWrapperResolver {
  readonly name = "kodikwrapper-archived";

  async resolve({ link }: { link: string }): Promise<DirectPlaybackResult> {
    const canonicalPlayerUrl = canonicalizeKodikPlayerLink(VideoLinks.normalizeKodikLink(link));
    const parsed = await VideoLinks.parseLink({ link: canonicalPlayerUrl, extended: true });
    if (!parsed.ex.playerSingleUrl) throw new Error("Kodik player chunk URL is missing");
    const playerSingleUrl = VideoLinks.normalizeKodikLink(parsed.ex.playerSingleUrl, "kodikplayer.com");
    const endpoint = await VideoLinks.getActualVideoInfoEndpoint(playerSingleUrl);
    const sources = normalizeSources(await VideoLinks.getLinks({ link: canonicalPlayerUrl, videoInfoEndpoint: endpoint }));
    if (!sources.length) throw new Error("Kodik returned no playable sources");
    return { sources };
  }
}

export class KodikRustResolver {
  readonly name = "kodik-rust-archived";
  private readonly url = process.env.KAIRO_KODIK_RUST_RESOLVER_URL;

  async resolve({ link }: { link: string }): Promise<DirectPlaybackResult> {
    if (!this.url) throw new Error("Rust resolver is not configured");
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ link }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Rust resolver returned ${response.status}`);
    const value = await response.json() as Partial<DirectPlaybackResult>;
    if (!Array.isArray(value.sources)) throw new Error("Rust resolver returned an invalid payload");
    return { sources: value.sources };
  }
}
