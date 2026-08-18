const dangerousProtocols = new Set(["javascript:", "data:", "file:"]);

export function validateMediaUrl(
  value: string,
  env: Record<string, string | undefined> = process.env,
): URL {
  const url = new URL(value);
  if (dangerousProtocols.has(url.protocol))
    throw new Error("Unsafe media URL protocol");
  const localhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    url.protocol !== "https:" &&
    !(localhost && env.ANIME_MEDIA_ALLOW_LOCALHOST === "true")
  )
    throw new Error("Media URL must use HTTPS");
  const hosts = new Set(
    (
      env.ANIME_MEDIA_ALLOWED_HOSTS ||
      "storage.googleapis.com,interactive-examples.mdn.mozilla.net"
    )
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!localhost && hosts.size && !hosts.has(url.hostname.toLowerCase()))
    throw new Error("Media host is not allowed");
  return url;
}
