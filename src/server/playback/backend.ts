import { z } from "zod";
import type { Anime } from "@/types/media";
import type { PlaybackService } from "./PlaybackService";
import { createPlaybackSessionSchema } from "./session/session-api";
import { toPlaybackSessionPublic } from "./session/types";
import { handleMasterStreamRoute, handleResourceStreamRoute, type StreamRouteProxy } from "./streaming/stream-route";

const publicAnimeSchema = z.object({
  id: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(500),
  titleEnglish: z.string().max(500).optional(),
  titleRomaji: z.string().max(500).optional(),
  titleNative: z.string().max(500).optional(),
  titleRu: z.string().max(500).optional(),
  titleUk: z.string().max(500).optional(),
  synonyms: z.array(z.string().max(500)).max(100).optional(),
  year: z.number().int().min(1900).max(2200).optional(),
  anilistId: z.number().int().positive().optional(),
  malId: z.number().int().positive().optional(),
}).strict();

const backendSessionSchema = createPlaybackSessionSchema.extend({ anime: publicAnimeSchema }).strict();

export type PlaybackBackendDependencies = {
  playbackService: Pick<PlaybackService, "createPlaybackSession">;
  streamProxy: StreamRouteProxy;
  publicOrigin: string;
};

function asAnime(value: z.infer<typeof publicAnimeSchema>): Anime {
  return {
    ...value,
    tagline: "",
    description: "",
    synopsis: "",
    genres: [],
    status: "UNKNOWN",
    art: "eclipse",
  };
}

export async function handlePlaybackBackendRequest(
  request: Request,
  dependencies: PlaybackBackendDependencies,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/health")
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });

  if (request.method === "POST" && pathname === "/api/playback/session") {
    const parsed = backendSessionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: { code: "INVALID_REQUEST", message: "Invalid playback request." } }, { status: 400 });
    try {
      const { anime, animeId: _animeId, ...preferences } = parsed.data;
      const session = await dependencies.playbackService.createPlaybackSession(asAnime(anime), preferences, request.signal);
      return session
        ? Response.json(toPlaybackSessionPublic(session, dependencies.publicOrigin), {
            status: 201,
            headers: { "Cache-Control": "no-store" },
          })
        : Response.json({ error: { code: "NO_PLAYABLE_SOURCE", message: "Video is temporarily unavailable." } }, { status: 503 });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return Response.json({ error: { code: "PLAYBACK_RESOLUTION_FAILED", message: "Playback is temporarily unavailable." } }, { status: 503 });
    }
  }

  const master = pathname.match(/^\/api\/stream\/([^/]+)\/master\.m3u8$/);
  if (request.method === "GET" && master)
    return handleMasterStreamRoute(request, decodeURIComponent(master[1]!), dependencies.streamProxy);
  const resource = pathname.match(/^\/api\/stream\/([^/]+)\/resource\/([^/]+)$/);
  if (request.method === "GET" && resource)
    return handleResourceStreamRoute(
      request,
      decodeURIComponent(resource[1]!),
      decodeURIComponent(resource[2]!),
      dependencies.streamProxy,
    );
  return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
