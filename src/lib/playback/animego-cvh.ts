import { z } from "zod";

export const animegoSearchResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  originalTitle: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  type: z.string().nullable().optional(),
  url: z.string().url(),
  poster: z.string().url().nullable().optional(),
  score: z.number().nullable().optional(),
});

export const animegoVoiceSchema = z.object({
  player: z.literal("cvh"),
  translationId: z.string().min(1),
  name: z.string().min(1),
  cvhId: z.string().min(1),
  vkId: z.string().nullable().optional(),
  embed: z.string().url(),
  episodeAvailable: z.boolean(),
  episodeCoverage: z.number().int().nonnegative(),
});

export const animegoVoicesSchema = z.object({
  provider: z.literal("animego-cvh"),
  titleId: z.string().min(1),
  episode: z.number().int().positive(),
  totalEpisodes: z.number().int().nullable().optional(),
  voices: z.array(animegoVoiceSchema),
});

export type AnimegoSearchResult = z.infer<typeof animegoSearchResultSchema>;
export type AnimegoVoice = z.infer<typeof animegoVoiceSchema>;
export type AnimegoVoices = z.infer<typeof animegoVoicesSchema>;
