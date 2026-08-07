import { requireUserSession } from "@/server/auth/require-session";
import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import {
  getPreferences,
  updatePreferences,
} from "@/server/services/preferences.service";
import { preferencesInput } from "@/server/validation/data";
export async function GET() {
  try {
    const { userId } = await requireUserSession();
    return apiSuccess(await getPreferences(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return privateApiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { userId } = await requireUserSession();
    const parsed = preferencesInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError("VALIDATION", "Invalid preferences data.", 400);
    return apiSuccess(await updatePreferences(userId, parsed.data));
  } catch (error) {
    return privateApiError(error);
  }
}
