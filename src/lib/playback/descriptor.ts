import { z } from "zod";

export const playbackProtocolSchema = z.enum(["hls", "mp4", "dash"]);

function isSecureMediaUrl(value: string) {
  if (
    /^\/api\/stream\/cvh\/[A-Za-z0-9_-]{24,64}\/(?:manifest\.m3u8|resources\/[A-Za-z0-9_-]{18,48})$/.test(
      value,
    )
  )
    return true;
  return URL.canParse(value) && new URL(value).protocol === "https:";
}

export const playbackTranslationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["voice", "subtitles"]).optional().nullable(),
});

export const playbackSourceSchema = z.object({
  protocol: playbackProtocolSchema,
  url: z.string().refine(isSecureMediaUrl, "HTTPS source required"),
  quality: z.number().int().positive().optional().nullable(),
});

export const playbackSkipSegmentSchema = z
  .object({
    kind: z.enum(["opening", "ending", "unknown"]),
    start: z.number().nonnegative(),
    end: z.number().positive(),
  })
  .refine((segment) => segment.end > segment.start, "Invalid segment range");

export const playbackDescriptorSchema = z.object({
  provider: z.string().min(1),
  titleId: z.string().min(1),
  episode: z.number().int().nonnegative(),
  translation: playbackTranslationSchema.optional().nullable(),
  sources: z.array(playbackSourceSchema).min(1),
  skipSegments: z.array(playbackSkipSegmentSchema).optional(),
  fallbackUsed: z.boolean().optional(),
  diagnostics: z
    .object({
      primaryFailureCode: z.string().nullable(),
      translationMatch: z
        .object({
          requestedName: z.string().nullable(),
          selectedName: z.string(),
          strategy: z.enum(["exact", "alias", "fuzzy", "default"]),
          confidence: z.number().min(0).max(1),
          changed: z.boolean(),
        })
        .nullable(),
    })
    .optional(),
});

export const playbackTitleInfoSchema = z.object({
  provider: z.string().min(1),
  titleId: z.string().min(1),
  seriesCount: z.number().int().nonnegative(),
  translations: z.array(playbackTranslationSchema),
});

export type PlaybackProtocol = z.infer<typeof playbackProtocolSchema>;
export type PlaybackSource = z.infer<typeof playbackSourceSchema>;
export type PlaybackTranslation = z.infer<typeof playbackTranslationSchema>;
export type PlaybackSkipSegment = z.infer<typeof playbackSkipSegmentSchema>;
export type PlaybackDescriptor = z.infer<typeof playbackDescriptorSchema>;
export type PlaybackTitleInfo = z.infer<typeof playbackTitleInfoSchema>;
