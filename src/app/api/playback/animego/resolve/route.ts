import { NextResponse } from "next/server";
import { resolveAnimegoTitle } from "@/server/playback/animego-cvh-provider-client";
import { PlaybackProviderError } from "@/server/playback/kodik-provider-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const titles = query
    .getAll("title")
    .map((value) => value.trim())
    .filter(Boolean);
  const yearValue = query.get("year");
  const year =
    yearValue && /^\d{4}$/.test(yearValue) ? Number(yearValue) : undefined;
  const mediaType = query.get("mediaType")?.trim() || undefined;
  if (!titles.length || titles.some((title) => title.length > 200))
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid titles" } },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await resolveAnimegoTitle({ titles, year, mediaType }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const value =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError(
            "PROVIDER_ERROR",
            "AnimeGO title resolve failed",
          );
    return NextResponse.json(
      { error: { code: value.code, message: value.message } },
      { status: value.status },
    );
  }
}
