import { z } from "zod";

export const createCommentSchema = z.object({
  animeId: z.string().trim().min(1).max(64),
  parentId: z.string().trim().min(1).max(64).optional(),
  seasonNumber: z.number().int().positive().max(999).optional(),
  episodeNumber: z.number().int().positive().max(10_000).optional(),
  body: z.string().trim().min(1).max(2_000),
  spoiler: z.boolean().default(false),
});
