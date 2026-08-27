import { NextResponse } from "next/server";
import { getAnimegoVoices } from "@/server/playback/animego-cvh-provider-client";
import { PlaybackProviderError } from "@/server/playback/kodik-provider-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const animeId = query.get("animeId")?.trim() ?? "";
  const episode = Number(query.get("episode"));
  if (
    !/^\d+$/.test(animeId) ||
    !Number.isSafeInteger(episode) ||
    episode < 1 ||
    episode > 10000
  )
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid voices query" } },
      { status: 400 },
    );
  try {
    return NextResponse.json(await getAnimegoVoices(animeId, episode), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const value =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError("PROVIDER_ERROR", "AnimeGO voices failed");
    return NextResponse.json(
      { error: { code: value.code, message: value.message } },
      { status: value.status },
    );
  }
}
