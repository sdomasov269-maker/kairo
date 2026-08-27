import { NextResponse } from "next/server";
import { PlaybackProviderError } from "@/server/playback/kodik-provider-client";
import { playbackManager } from "@/server/playback/provider-manager";

export const dynamic = "force-dynamic";

function integer(value: string | null, minimum: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const shikimoriId = integer(query.get("shikimoriId"), 1, 999_999_999);
  const episode = integer(query.get("episode"), 1, 10_000);
  const titles = query
    .getAll("title")
    .map((value) => value.trim())
    .filter(Boolean);
  const year = integer(query.get("year"), 1900, 2200) ?? undefined;
  const translationId = query.get("translationId")?.trim() || undefined;
  const preferredTranslationName =
    query.get("translationName")?.trim() || undefined;
  if (
    !shikimoriId ||
    !episode ||
    !titles.length ||
    titles.some((title) => title.length > 200)
  )
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid playback query" } },
      { status: 400 },
    );
  const simulationEnabled = process.env.PLAYBACK_DEBUG_SIMULATION === "1";
  try {
    return NextResponse.json(
      await playbackManager.resolve({
        shikimoriId,
        episode,
        titles,
        year,
        mediaType: query.get("mediaType")?.trim() || undefined,
        translationId,
        preferredTranslationName,
        simulateKodikFailure: simulationEnabled
          ? query.get("simulateKodikFailure") || undefined
          : undefined,
        simulateCvhFailure: simulationEnabled
          ? query.get("simulateCvhFailure") || undefined
          : undefined,
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const value =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError(
            "INTERNAL_CONTRACT_ERROR",
            "Playback resolve failed",
          );
    return NextResponse.json(
      { error: { code: value.code, message: value.message } },
      { status: value.status },
    );
  }
}
