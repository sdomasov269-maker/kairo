import { requireUserSession } from "@/server/auth/require-session";
import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import { deleteAnimeList } from "@/server/services/anime-list.service";
import { animeKey } from "@/server/validation/data";
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ animeKey: string }> },
) {
  try {
    const { userId } = await requireUserSession();
    const parsed = animeKey.safeParse((await params).animeKey);
    if (!parsed.success)
      return apiError("VALIDATION", "Invalid anime key.", 400);
    const result = await deleteAnimeList(userId, parsed.data);
    return apiSuccess({ deleted: result.count > 0 });
  } catch (error) {
    return privateApiError(error);
  }
}
