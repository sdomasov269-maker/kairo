import "server-only";
import { prisma } from "@/lib/db";
import type { z } from "zod";
import { preferencesInput } from "@/server/validation/data";
type Input = z.infer<typeof preferencesInput>;
const dto = (item: {
  locale: string;
  autoplayNext: boolean;
  playbackRate: number;
  subtitleLanguage: string | null;
  subtitlesEnabled: boolean;
  subtitleSize: string;
  subtitleBackground: string;
  preferredAudioLanguage: string | null;
  preferredQualityMode: string;
  reducedEffectsPreference: string;
  updatedAt: Date;
}) => ({
  locale: item.locale,
  autoplayNext: item.autoplayNext,
  playbackRate: item.playbackRate,
  subtitleLanguage: item.subtitleLanguage,
  subtitlesEnabled: item.subtitlesEnabled,
  subtitleSize: item.subtitleSize,
  subtitleBackground: item.subtitleBackground,
  preferredAudioLanguage: item.preferredAudioLanguage,
  preferredQualityMode: Number.isFinite(Number(item.preferredQualityMode))
    ? Number(item.preferredQualityMode)
    : "auto",
  reducedEffectsPreference: item.reducedEffectsPreference,
  updatedAt: item.updatedAt.toISOString(),
});
export const getPreferences = (userId: string) =>
  prisma.userPreferences
    .upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
    .then(dto);
export const updatePreferences = (userId: string, input: Input) =>
  prisma.userPreferences
    .upsert({
      where: { userId },
      create: {
        userId,
        ...input,
        preferredQualityMode: String(input.preferredQualityMode),
      },
      update: {
        ...input,
        preferredQualityMode: String(input.preferredQualityMode),
      },
    })
    .then(dto);
