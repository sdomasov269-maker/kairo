import { requireUserSession } from "@/server/auth/require-session";
import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import {
  clearProgress,
  getProgress,
  upsertProgress,
} from "@/server/services/progress.service";
import { progressInput } from "@/server/validation/data";
export async function GET() {
  try {
    const { userId } = await requireUserSession();
    return apiSuccess(await getProgress(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return privateApiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { userId } = await requireUserSession();
    const parsed = progressInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError("VALIDATION", "Invalid progress data.", 400);
    return apiSuccess(await upsertProgress(userId, parsed.data));
  } catch (e) {
    return privateApiError(e);
  }
}
export async function DELETE() {
  try {
    const { userId } = await requireUserSession();
    await clearProgress(userId);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return privateApiError(e);
  }
}
