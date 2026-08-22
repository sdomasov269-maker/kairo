import { z } from "zod";
import type { Anime } from "@/types/media";
import { toPlaybackSessionPublic, type PlaybackSession } from "./types.ts";

export const createPlaybackSessionSchema = z
  .object({
    animeId: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
    season: z.number().int().min(1).max(999).default(1),
    episode: z.number().int().min(1).max(10_000).default(1),
    preferredLanguage: z.string().trim().min(2).max(16).regex(/^[a-zA-Z-]+$/).optional(),
    preferredTranslation: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type CreatePlaybackSessionInput = z.infer<typeof createPlaybackSessionSchema>;

export type PlaybackSessionApiDependencies = {
  resolveAnime(animeId: string): Promise<Anime | null>;
  createSession(
    anime: Anime,
    preferences: Pick<CreatePlaybackSessionInput, "season" | "episode" | "preferredLanguage" | "preferredTranslation">,
    signal?: AbortSignal,
  ): Promise<PlaybackSession | null>;
};

export async function handleCreatePlaybackSession(
  request: Request,
  dependencies: PlaybackSessionApiDependencies,
): Promise<Response> {
  const parsed = createPlaybackSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { code: "INVALID_REQUEST", message: "Invalid playback request." } }, { status: 400 });

  try {
    const anime = await dependencies.resolveAnime(parsed.data.animeId);
    if (!anime)
      return Response.json({ error: { code: "ANIME_NOT_FOUND", message: "Anime not found." } }, { status: 404 });

    const session = await dependencies.createSession(
      anime,
      {
        season: parsed.data.season,
        episode: parsed.data.episode,
        ...(parsed.data.preferredLanguage ? { preferredLanguage: parsed.data.preferredLanguage } : {}),
        ...(parsed.data.preferredTranslation ? { preferredTranslation: parsed.data.preferredTranslation } : {}),
      },
      request.signal,
    );
    if (!session)
      return Response.json({ error: { code: "NO_PLAYABLE_SOURCE", message: "Video is temporarily unavailable." } }, { status: 503 });

    return Response.json(toPlaybackSessionPublic(session), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (process.env.NODE_ENV === "development")
      console.warn(`[KairoPlayback] session.create.failed reason=${error instanceof Error ? error.name : "unknown"}`);
    return Response.json({ error: { code: "PLAYBACK_RESOLUTION_FAILED", message: "Playback is temporarily unavailable." } }, { status: 503 });
  }
}
