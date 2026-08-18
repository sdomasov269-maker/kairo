import { z } from "zod";
export const kodikConfigurationSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().url().startsWith("https://").optional(),
  tokenConfigured: z.boolean(),
  playbackEnabled: z.boolean(),
});
