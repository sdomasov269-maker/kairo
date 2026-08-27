import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const providerBaseUrl = () =>
  process.env.ANIME_PROVIDER_URL?.trim() || "http://127.0.0.1:8787";

function relayPath(sessionId: string, resource: string[]) {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(sessionId)) return null;
  if (resource.length === 1 && resource[0] === "manifest.m3u8")
    return `/v1/relay/cvh/${sessionId}/manifest.m3u8`;
  if (
    resource.length === 2 &&
    resource[0] === "resources" &&
    /^[A-Za-z0-9_-]{18,48}$/.test(resource[1])
  )
    return `/v1/relay/cvh/${sessionId}/resources/${resource[1]}`;
  return null;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/stream/cvh/[sessionId]/[...resource]">,
) {
  const { sessionId, resource } = await context.params;
  const path = relayPath(sessionId, resource);
  if (!path)
    return NextResponse.json(
      {
        error: {
          code: "SEGMENT_NOT_FOUND",
          message: "Relay resource was not found",
        },
      },
      { status: 404 },
    );
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))
    return NextResponse.json(
      { error: { code: "UPSTREAM_REJECTED", message: "Invalid byte range" } },
      { status: 416 },
    );
  let upstream: Response;
  try {
    upstream = await fetch(new URL(path, providerBaseUrl()), {
      cache: "no-store",
      headers: range ? { range } : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const timeout =
      error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: {
          code: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
          message: timeout ? "Relay timed out" : "Relay is unavailable",
        },
      },
      { status: timeout ? 504 : 502 },
    );
  }
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  });
  for (const name of ["content-range", "accept-ranges", "content-length"])
    if (upstream.headers.get(name))
      headers.set(name, upstream.headers.get(name)!);
  if (contentType.toLocaleLowerCase().includes("mpegurl")) {
    const body = (await upstream.text()).replaceAll(
      "/v1/relay/cvh/",
      "/api/stream/cvh/",
    );
    headers.delete("content-length");
    return new Response(body, { status: upstream.status, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
