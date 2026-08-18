import { apiError, apiSuccess } from "@/server/api/response";
import { getReleaseSchedule } from "@/server/services/release-schedule.service";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("start");
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return apiError("VALIDATION", "Invalid schedule start.", 400);
  const start = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()))
    return apiError("VALIDATION", "Invalid schedule start.", 400);
  try {
    return apiSuccess(await getReleaseSchedule(start), {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch {
    return apiError("UNKNOWN", "Release schedule is unavailable.", 503);
  }
}
