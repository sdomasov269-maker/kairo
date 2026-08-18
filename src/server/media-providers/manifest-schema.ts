import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AuthorizedProviderManifest } from "./manifest-provider.ts";

const text = z.string().trim().min(1).max(500);
const optionalText = z.string().trim().min(1).max(2000).optional();
const variant = z
  .object({ id: text, language: z.string().trim().min(2).max(16), label: text })
  .strict();
const subtitle = z
  .object({
    language: z.string().trim().min(2).max(16),
    label: text,
    url: z.string().url().max(4096),
    format: z.literal("vtt"),
  })
  .strict();
const playback = z
  .object({
    kind: z.enum(["DIRECT", "EMBED"]),
    referenceId: text,
    protocol: z.enum(["DASH", "HLS", "MP4"]).optional(),
    url: z.string().url().max(4096),
    expiresAt: z.string().datetime().optional(),
    subtitles: z.array(subtitle).max(50).optional(),
  })
  .strict();
const episode = z
  .object({
    providerEpisodeId: text,
    seasonNumber: z.number().int().positive().max(999),
    episodeNumber: z.number().int().positive().max(10000),
    absoluteNumber: z.number().int().positive().max(10000).optional(),
    title: optionalText,
    titleRu: optionalText,
    titleUk: optionalText,
    airDate: z.string().datetime().optional(),
    durationSeconds: z.number().int().positive().max(86400).optional(),
    isPublished: z.boolean(),
    audioVariants: z.array(variant).max(50).optional(),
    subtitleVariants: z.array(variant).max(50).optional(),
    playback: playback.optional(),
  })
  .strict();
const anime = z
  .object({
    providerAnimeId: text,
    title: text,
    alternativeTitles: z.array(text).max(100).optional(),
    anilistId: z.number().int().positive().optional(),
    malId: z.number().int().positive().optional(),
    year: z.number().int().min(1900).max(2200).optional(),
    format: optionalText,
    confidence: z.number().int().min(0).max(100).optional(),
    description: optionalText,
    episodeCount: z.number().int().positive().max(10000).optional(),
    status: optionalText,
    episodes: z.array(episode).min(1).max(2000),
  })
  .strict();
export const providerManifestSchema = z
  .object({
    version: z.literal(1),
    provider: z
      .object({
        key: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,62}$/),
        name: text,
      })
      .strict(),
    authorization: z
      .object({
        documentedApi: z.boolean(),
        officialEmbed: z.boolean(),
        licensedDirectMedia: z.boolean(),
        feed: z.boolean(),
        partnerAccess: z.boolean(),
        writtenPermission: z.boolean(),
      })
      .strict(),
    anime: z.array(anime).length(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = new Set<string>();
    const positions = new Set<string>();
    for (const [index, item] of manifest.anime[0]?.episodes.entries() ?? []) {
      const position = `${item.seasonNumber}:${item.episodeNumber}`;
      if (ids.has(item.providerEpisodeId))
        context.addIssue({
          code: "custom",
          message: `Duplicate providerEpisodeId: ${item.providerEpisodeId}`,
          path: ["anime", 0, "episodes", index, "providerEpisodeId"],
        });
      if (positions.has(position))
        context.addIssue({
          code: "custom",
          message: `Duplicate episode position: ${position}`,
          path: ["anime", 0, "episodes", index, "episodeNumber"],
        });
      ids.add(item.providerEpisodeId);
      positions.add(position);
    }
  });
export type ValidatedProviderManifest = AuthorizedProviderManifest &
  z.infer<typeof providerManifestSchema>;

export async function readProviderManifest(
  file: string,
): Promise<ValidatedProviderManifest> {
  const resolved = path.resolve(file);
  const info = await stat(resolved);
  if (!info.isFile() || info.size > 5 * 1024 * 1024)
    throw new Error("Manifest must be a JSON file smaller than 5 MB");
  const raw = await readFile(resolved, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
  const result = providerManifestSchema.safeParse(parsed);
  if (!result.success)
    throw new Error(
      `Manifest validation failed:\n${z.prettifyError(result.error)}`,
    );
  return result.data;
}
