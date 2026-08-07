import { apiError, apiSuccess, privateApiError } from "@/server/api/response";
import { requireUserSession } from "@/server/auth/require-session";
import { mergeLocalData } from "@/server/services/merge.service";
import { mergeLocalDataInput } from "@/server/validation/merge";
const buckets = new Map<string, { count: number; reset: number }>();
const MAX_BODY = 256 * 1024;
export async function POST(request: Request) {
  try {
    const { userId } = await requireUserSession();
    const now = Date.now();
    const bucket = buckets.get(userId);
    if (bucket && bucket.reset > now && bucket.count >= 5)
      return apiError("RATE_LIMITED", "Too many merge attempts.", 429);
    buckets.set(
      userId,
      bucket && bucket.reset > now
        ? { ...bucket, count: bucket.count + 1 }
        : { count: 1, reset: now + 60_000 },
    );
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY)
      return apiError("VALIDATION", "Request is too large.", 413);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY)
      return apiError("VALIDATION", "Request is too large.", 413);
    const parsed = mergeLocalDataInput.safeParse(JSON.parse(text));
    if (!parsed.success)
      return apiError("VALIDATION", "Invalid local data.", 400);
    return apiSuccess(await mergeLocalData(userId, parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError("VALIDATION", "Invalid JSON.", 400);
    return privateApiError(error);
  }
}
