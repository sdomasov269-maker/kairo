import { NextResponse } from "next/server";
import { searchAnimego } from "@/server/playback/animego-cvh-provider-client";
import { PlaybackProviderError } from "@/server/playback/kodik-provider-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 200)
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid query" } },
      { status: 400 },
    );
  try {
    return NextResponse.json(await searchAnimego(query), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const value =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError("PROVIDER_ERROR", "AnimeGO search failed");
    return NextResponse.json(
      { error: { code: value.code, message: value.message } },
      { status: value.status },
    );
  }
}
