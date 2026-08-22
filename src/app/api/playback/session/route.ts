import { resolveAnimeBySlug } from "@/lib/anime/resolve";
import { playbackService } from "@/server/playback/playback.service";
import { handleCreatePlaybackSession } from "@/server/playback/session/session-api";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleCreatePlaybackSession(request, {
    resolveAnime: resolveAnimeBySlug,
    createSession: (anime, preferences, signal) =>
      playbackService.createPlaybackSession(anime, preferences, signal),
  });
}
