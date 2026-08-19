const CANONICAL_KODIK_PLAYER_ORIGIN = "https://kodikplayer.com";

/** Converts retired Kodik player aliases without changing the video path/query. */
export function canonicalizeKodikPlayerLink(link: string): string {
  const normalized = link.startsWith("//") ? `https:${link}` : link;
  const url = new URL(normalized);
  url.protocol = "https:";
  url.host = "kodikplayer.com";
  return url.toString();
}

export { CANONICAL_KODIK_PLAYER_ORIGIN };
