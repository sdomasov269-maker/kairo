import { NextResponse } from "next/server";
import { updateRoomSchema } from "@/domain/watch-party/schemas";
import {
  requireUserSession,
  UnauthorizedError,
} from "@/server/auth/require-session";
import {
  endWatchParty,
  resolveWatchParty,
  updateWatchParty,
  WatchPartyError,
} from "@/server/services/watch-party.service";

function failure(error: unknown) {
  if (error instanceof UnauthorizedError)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (error instanceof WatchPartyError)
    return NextResponse.json(
      { error: error.code },
      {
        status:
          error.code === "FORBIDDEN"
            ? 403
            : error.code === "CONFLICT"
              ? 409
              : 404,
      },
    );
  return NextResponse.json(
    { error: "WATCH_PARTY_UNAVAILABLE" },
    { status: 503 },
  );
}
export async function GET(
  _: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const user = await requireUserSession();
    return NextResponse.json(
      await resolveWatchParty((await context.params).code, user.userId),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const user = await requireUserSession();
    const input = updateRoomSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    return NextResponse.json(
      await updateWatchParty(
        (await context.params).code,
        user.userId,
        input.data,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  _: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const user = await requireUserSession();
    await endWatchParty((await context.params).code, user.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
