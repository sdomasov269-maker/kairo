import { NextResponse } from "next/server";
import { playbackResolverService } from "@/server/playback/playback-resolver.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 30;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  if (rateLimits.size > 1_000)
    for (const [candidate, limit] of rateLimits)
      if (limit.resetAt <= now) rateLimits.delete(candidate);
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_REQUESTS;
}

export async function POST(request: Request) {
  if (isRateLimited(request))
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "retry-after": "60" } },
    );
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES)
    return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const playerLink = (body as { playerLink?: unknown }).playerLink;
  const forceRefresh = (body as { forceRefresh?: unknown }).forceRefresh;
  if (typeof playerLink !== "string" || playerLink.length > 2_048)
    return NextResponse.json(
      { error: "INVALID_PLAYER_LINK" },
      { status: 400 },
    );

  try {
    // A force refresh is intentionally accepted for backwards-compatible
    // clients. Endpoint invalidation/retry belongs to the server resolver.
    void forceRefresh;
    const playback = await playbackResolverService.resolve(playerLink);
    return NextResponse.json(playback, {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-kairo-playback-debug":
          process.env.KAIRO_PLAYBACK_DEBUG === "true" ? "1" : "0",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "DIRECT_STREAM_UNAVAILABLE" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
