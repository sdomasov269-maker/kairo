import { NextResponse } from "next/server";
import { requireUserSession, UnauthorizedError } from "@/server/auth/require-session";
import { resolveWatchParty, WatchPartyError } from "@/server/services/watch-party.service";
import { createAblyTokenRequest } from "@/server/watch-party/ably-token";

export async function GET(request: Request) {
  try {
    const user = await requireUserSession();
    const room = await resolveWatchParty(new URL(request.url).searchParams.get("code") ?? "", user.userId);
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "REALTIME_UNAVAILABLE" }, { status: 503 });
    const limit = Math.max(2, Math.min(50, Number(process.env.WATCH_PARTY_MAX_MEMBERS) || 10));
    const presenceResponse = await fetch(`https://rest.ably.io/channels/${encodeURIComponent(room.channelName)}/presence?limit=${limit + 1}`, { headers: { authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` }, cache: "no-store" });
    if (presenceResponse.ok) {
      const presence = await presenceResponse.json() as { items?: Array<{ clientId?: string }> };
      const members = new Set((presence.items ?? []).map((item) => item.clientId).filter(Boolean));
      if (!members.has(user.userId) && members.size >= limit) return NextResponse.json({ error: "ROOM_FULL" }, { status: 409 });
    }
    return NextResponse.json(createAblyTokenRequest(apiKey, user.userId, room.channelName, room.isHost));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof WatchPartyError) return NextResponse.json({ error: error.code }, { status: 404 });
    return NextResponse.json({ error: "REALTIME_UNAVAILABLE" }, { status: 503 });
  }
}
