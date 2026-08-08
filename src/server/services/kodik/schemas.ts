import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const numericId = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform(Number);

export const kodikTranslationSchema = z
  .object({
    id: numericId,
    title: z.string().min(1),
    type: z.enum(["voice", "subtitles"]),
    voice: nullableString,
    is_active: z.boolean().nullable().optional(),
  })
  .passthrough();

export const kodikEpisodeValueSchema = z.union([
  z.string(),
  z
    .object({
      link: z.string(),
      title: nullableString,
      screenshots: z.array(z.string()).nullable().optional(),
    })
    .passthrough(),
]);

const blockedSeasonsSchema = z.union([
  z.literal("all"),
  z.record(
    z.string(),
    z.union([z.literal("all"), z.array(z.union([z.string(), z.number()]))]),
  ),
]);

export const kodikMaterialSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    type: z.string(),
    link: z.string(),
    title: z.string().min(1),
    title_orig: nullableString,
    other_title: nullableString,
    translation: kodikTranslationSchema,
    year: nullableNumber,
    kinopoisk_id: nullableString,
    imdb_id: nullableString,
    mdl_id: nullableString,
    worldart_link: nullableString,
    shikimori_id: z.union([z.string(), z.number()]).nullable().optional(),
    quality: nullableString,
    camrip: z.boolean().nullable().optional(),
    blocked_countries: z.array(z.string()).nullable().optional(),
    created_at: nullableString,
    updated_at: nullableString,
    last_season: nullableNumber,
    last_episode: nullableNumber,
    episodes_count: nullableNumber,
    blocked_seasons: blockedSeasonsSchema.nullable().optional(),
    screenshots: z.array(z.string()).nullable().optional(),
    material_data: z.record(z.string(), z.unknown()).nullable().optional(),
    seasons: z
      .record(
        z.string(),
        z
          .object({
            link: nullableString,
            episodes: z.record(z.string(), kodikEpisodeValueSchema).optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export const kodikResponseSchema = z
  .object({
    time: z.union([z.string(), z.number()]).nullable().optional(),
    total: nullableNumber,
    prev_page: nullableString,
    next_page: nullableString,
    results: z.array(kodikMaterialSchema),
  })
  .passthrough();

export type KodikMaterial = z.infer<typeof kodikMaterialSchema>;
export type KodikApiResponse = z.infer<typeof kodikResponseSchema>;
