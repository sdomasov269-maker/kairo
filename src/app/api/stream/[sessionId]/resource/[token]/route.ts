import { streamProxy } from "@/server/playback/streaming/runtime";
import { handleResourceStreamRoute } from "@/server/playback/streaming/stream-route";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; token: string }> },
) {
  const { sessionId, token } = await params;
  return handleResourceStreamRoute(request, sessionId, token, streamProxy);
}
