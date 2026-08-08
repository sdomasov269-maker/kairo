import { NextResponse } from "next/server";
import { createRoomSchema } from "@/domain/watch-party/schemas";
import { requireUserSession, UnauthorizedError } from "@/server/auth/require-session";
import { createWatchParty, WatchPartyError } from "@/server/services/watch-party.service";

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const input = createRoomSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    return NextResponse.json(await createWatchParty(session.userId, input.data), { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof WatchPartyError) return NextResponse.json({ error: error.code }, { status: error.code === "RATE_LIMITED" ? 429 : 404 });
    return NextResponse.json({ error: "WATCH_PARTY_UNAVAILABLE" }, { status: 503 });
  }
}
