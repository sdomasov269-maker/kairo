import { requireUserSession } from "@/server/auth/require-session";
import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import { deleteProgress } from "@/server/services/progress.service";
import { animeKey as animeKeySchema } from "@/server/validation/data";
export async function DELETE(
  _: Request,
  {
    params,
  }: { params: Promise<{ animeKey: string; season: string; episode: string }> },
) {
  try {
    const { userId } = await requireUserSession();
    const p = await params,
      animeKey = animeKeySchema.safeParse(p.animeKey),
      season = Number(p.season),
      episode = Number(p.episode);
    if (
      !animeKey.success ||
      !Number.isInteger(season) ||
      season < 1 ||
      !Number.isInteger(episode) ||
      episode < 1
    )
      return apiError("VALIDATION", "Invalid progress key.", 400);
    const result = await deleteProgress(userId, animeKey.data, season, episode);
    return apiSuccess({ deleted: result.count > 0 });
  } catch (error) {
    return privateApiError(error);
  }
}
