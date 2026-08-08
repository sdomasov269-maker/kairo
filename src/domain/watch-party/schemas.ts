import { z } from "zod";

export const roomCodeSchema = z.string().trim().toUpperCase().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
export const createRoomSchema = z.object({
  animeId: z.string().min(1).max(64),
  slug: z.string().min(1).max(120),
  seasonNumber: z.number().int().positive().max(999).nullable(),
  episodeNumber: z.number().int().positive().max(10_000).nullable(),
  translationId: z.number().int().positive().nullable(),
});
export const updateRoomSchema = z.object({
  seasonNumber: z.number().int().positive().max(999).nullable(),
  episodeNumber: z.number().int().positive().max(10_000).nullable(),
  translationId: z.number().int().positive().nullable(),
  revision: z.number().int().nonnegative(),
});
export const watchPartyStateSchema = z.object({
  roomId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  hostUserId: z.string().min(1),
  animeId: z.string().min(1),
  slug: z.string().min(1).max(120),
  season: z.number().int().positive().nullable(),
  episode: z.number().int().positive().nullable(),
  translationId: z.number().int().positive().nullable(),
  playback: z.object({
    playing: z.boolean(),
    currentTime: z.number().finite().nonnegative(),
    playbackRate: z.number().min(0.25).max(2),
    updatedAtServerTime: z.number().int().positive(),
  }),
});
export const watchPartyEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ROOM_STATE"), state: watchPartyStateSchema }),
  z.object({ type: z.literal("ROOM_ENDED"), roomId: z.string().min(1), revision: z.number().int().nonnegative() }),
]);
