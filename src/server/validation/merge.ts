import { z } from "zod";
import { animeKey, preferencesInput } from "./data";
const isoDate = z.string().datetime({ offset: true });
export const localProgressInput = z
  .object({
    animeKey: animeKey.optional(),
    animeSlug: animeKey.optional(),
    seasonNumber: z.number().int().positive(),
    episodeNumber: z.number().int().positive(),
    currentTime: z.number().finite().nonnegative(),
    duration: z.number().finite().nonnegative(),
    updatedAt: isoDate,
  })
  .strict()
  .refine((x) => Boolean(x.animeKey || x.animeSlug), "anime key required")
  .transform((x) => ({ ...x, animeKey: x.animeKey ?? x.animeSlug! }));
export const localListInput = z
  .object({
    animeKey,
    status: z.enum(["PLANNED", "WATCHING", "COMPLETED", "PAUSED", "DROPPED"]),
    addedAt: isoDate.optional(),
    updatedAt: isoDate,
  })
  .strict();
export const mergeLocalDataInput = z
  .object({
    progress: z.array(localProgressInput).max(300),
    animeList: z.array(localListInput).max(500),
    preferences: preferencesInput.strict().optional(),
    preferencesStrategy: z.enum(["local", "account"]),
  })
  .strict();
