import { NextResponse } from "next/server";
import {
  PlaybackProviderError,
  resolveKodikPlayback,
} from "@/server/playback/kodik-provider-client";

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
  const episode = integer(query.get("episode"), 0, 10_000);
  const translationId = query.get("translationId")?.trim() || undefined;
  if (
    !shikimoriId ||
    episode === null ||
    (translationId && translationId.length > 100)
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid playback query" } },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await resolveKodikPlayback({ shikimoriId, episode, translationId }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const providerError =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError(
            "RESOLVE_FAILED",
            "Playback resolve failed",
          );
    return NextResponse.json(
      { error: { code: providerError.code, message: providerError.message } },
      { status: providerError.status },
    );
  }
}
