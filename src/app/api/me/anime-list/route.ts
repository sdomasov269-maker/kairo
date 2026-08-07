import { requireUserSession } from "@/server/auth/require-session";
import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import {
  clearAnimeList,
  getAnimeList,
  upsertAnimeList,
} from "@/server/services/anime-list.service";
import { animeListInput } from "@/server/validation/data";
export async function GET() {
  try {
    const { userId } = await requireUserSession();
    return apiSuccess(await getAnimeList(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return privateApiError(error);
  }
}
export async function DELETE() {
  try {
    const { userId } = await requireUserSession();
    await clearAnimeList(userId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return privateApiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { userId } = await requireUserSession();
    const parsed = animeListInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError("VALIDATION", "Invalid anime list data.", 400);
    return apiSuccess(
      await upsertAnimeList(userId, parsed.data.animeKey, parsed.data.status),
    );
  } catch (error) {
    return privateApiError(error);
  }
}
