import { z } from "zod";
export const animeKey = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
export const progressInput = z.object({
  animeKey,
  seasonNumber: z.number().int().positive(),
  episodeNumber: z.number().int().positive(),
  currentTime: z.number().finite().nonnegative(),
  duration: z.number().finite().nonnegative(),
});
export const animeListInput = z.object({
  animeKey,
  status: z.enum(["PLANNED", "WATCHING", "COMPLETED", "PAUSED", "DROPPED"]),
});
export const preferencesInput = z.object({
  locale: z.enum(["ru", "uk", "en"]),
  autoplayNext: z.boolean(),
  playbackRate: z.number().min(0.5).max(2),
  subtitleLanguage: z.string().max(12).nullable(),
  subtitlesEnabled: z.boolean(),
  subtitleSize: z.enum(["small", "medium", "large"]),
  subtitleBackground: z.enum(["none", "shadow", "solid"]),
  preferredAudioLanguage: z.string().max(12).nullable(),
  preferredQualityMode: z.union([
    z.literal("auto"),
    z.number().int().positive(),
  ]),
  reducedEffectsPreference: z.enum(["full", "balanced", "minimal"]),
});
