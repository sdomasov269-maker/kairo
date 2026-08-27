import { NextResponse } from "next/server";
import {
  getKodikTitleInfo,
  PlaybackProviderError,
} from "@/server/playback/kodik-provider-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("shikimoriId");
  const shikimoriId = value && /^\d+$/.test(value) ? Number(value) : 0;
  if (
    !Number.isSafeInteger(shikimoriId) ||
    shikimoriId < 1 ||
    shikimoriId > 999_999_999
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid Shikimori ID" } },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await getKodikTitleInfo(shikimoriId), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const providerError =
      error instanceof PlaybackProviderError
        ? error
        : new PlaybackProviderError("RESOLVE_FAILED", "Title resolve failed");
    return NextResponse.json(
      { error: { code: providerError.code, message: providerError.message } },
      { status: providerError.status },
    );
  }
}
