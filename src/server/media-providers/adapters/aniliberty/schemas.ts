import { z } from "zod";

const image = z
  .object({
    preview: z.unknown().optional(),
    thumbnail: z.unknown().optional(),
    optimized: z.unknown().optional(),
  })
  .passthrough();
const name = z
  .object({
    main: z.string().nullish(),
    english: z.string().nullish(),
    alternative: z.string().nullish(),
  })
  .passthrough();
export const episodeSchema = z
  .object({
    id: z.string(),
    release_id: z.number().optional(),
    ordinal: z.number(),
    sort_order: z.number().optional(),
    name: z.string().nullish(),
    name_english: z.string().nullish(),
    duration: z.number().nullish(),
    preview: image.nullish(),
    updated_at: z.string().nullish(),
    hls_480: z.string().nullish(),
    hls_720: z.string().nullish(),
    hls_1080: z.string().nullish(),
    rutube_id: z.string().nullish(),
    youtube_id: z.string().nullish(),
  })
  .passthrough();
export const releaseSchema = z
  .object({
    id: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
    year: z.number().nullish(),
    alias: z.string().nullish(),
    name: name.nullish(),
    type: z
      .union([
        z.string(),
        z
          .object({
            value: z.string().optional(),
            description: z.string().optional(),
          })
          .passthrough(),
      ])
      .nullish(),
    season: z
      .object({
        value: z.string().optional(),
        description: z.string().optional(),
      })
      .passthrough()
      .nullish(),
    poster: image.nullish(),
    description: z.string().nullish(),
    episodes_total: z.number().nullish(),
    is_ongoing: z.boolean().nullish(),
    is_in_production: z.boolean().nullish(),
    is_blocked_by_geo: z.boolean().nullish(),
    is_blocked_by_copyrights: z.boolean().nullish(),
    updated_at: z.string().nullish(),
    episodes: z.array(episodeSchema).optional(),
  })
  .passthrough();
export const AniLibertySearchResponseSchema = z.array(z.unknown());
export const AniLibertySearchItemSchema = z
  .object({
    id: z.union([z.number(), z.string().min(1)]),
    alias: z.string().nullish(),
    year: z.union([z.number(), z.string().regex(/^\d{4}$/)]).nullish(),
    description: z.string().nullish(),
    name: z
      .object({
        main: z.string().nullish(),
        english: z.string().nullish(),
        alternative: z.string().nullish(),
      })
      .passthrough(),
    type: z
      .union([
        z.string(),
        z
          .object({
            value: z.string().nullish(),
            description: z.string().nullish(),
          })
          .passthrough(),
      ])
      .nullish(),
  })
  .passthrough()
  .superRefine((item, context) => {
    if (
      ![item.name.main, item.name.english, item.name.alternative].some(
        (value) => typeof value === "string" && value.trim(),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "At least one title is required",
      });
  });
export const searchResponseSchema = AniLibertySearchResponseSchema;
export const scheduleSchema = z
  .object({ data: z.array(z.unknown()) })
  .passthrough();
export const openApiSchema = z
  .object({
    openapi: z.string().regex(/^3\.0(?:\.|$)/),
    info: z.object({ title: z.string(), version: z.string() }).passthrough(),
    servers: z.array(z.object({ url: z.string() }).passthrough()).min(1),
    paths: z.record(z.string(), z.unknown()),
    components: z
      .object({
        schemas: z.record(z.string(), z.unknown()).optional(),
        securitySchemes: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    security: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
