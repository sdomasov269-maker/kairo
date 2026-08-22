import { streamProxy } from "@/server/playback/streaming/runtime";
import { handleMasterStreamRoute } from "@/server/playback/streaming/stream-route";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  return handleMasterStreamRoute(request, sessionId, streamProxy);
}
