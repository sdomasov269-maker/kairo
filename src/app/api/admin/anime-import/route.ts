import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importAnimePage } from "@/server/services/anime-import.service";

function authorized(request: Request) {
  const secret = process.env.ANIME_IMPORT_SECRET;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(secret ?? "");
  const suppliedBuffer = Buffer.from(supplied);
  if (!secret || suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    page?: number;
    perPage?: number;
  };
  const page = Number.isInteger(body.page) ? Math.max(1, body.page!) : 1;
  const perPage = Number.isInteger(body.perPage)
    ? Math.min(50, Math.max(1, body.perPage!))
    : 50;
  return NextResponse.json(await importAnimePage(page, perPage));
}
