import type { AnimeMediaProvider, ProviderPlayback } from "./types.ts";
import { validateMediaUrl } from "../../domain/watch/media-url.ts";

export type ProviderAuthorization = {
  documentedApi: boolean;
  officialEmbed: boolean;
  licensedDirectMedia: boolean;
  feed: boolean;
  partnerAccess: boolean;
  writtenPermission: boolean;
};
export function isProviderSupported(auth: ProviderAuthorization) {
  return Object.values(auth).some(Boolean);
}
export function assertProviderSupported(
  provider: AnimeMediaProvider,
  auth: ProviderAuthorization,
) {
  if (!isProviderSupported(auth))
    throw new Error(
      `Provider ${provider.key} is unsupported: no authorized integration method`,
    );
  if (
    provider.capabilities.OFFICIAL_EMBED &&
    !auth.officialEmbed &&
    !auth.writtenPermission
  )
    throw new Error(
      `Provider ${provider.key} has no official embed permission`,
    );
  if (
    provider.capabilities.DIRECT_MEDIA &&
    !auth.licensedDirectMedia &&
    !auth.partnerAccess &&
    !auth.writtenPermission
  )
    throw new Error(
      `Provider ${provider.key} has no licensed direct-media permission`,
    );
}
export function validateProviderPlayback(
  playback: ProviderPlayback,
  env = process.env,
) {
  const url = validateMediaUrl(playback.url, env);
  if (playback.kind === "DIRECT" && !playback.protocol)
    throw new Error("Direct playback requires a protocol");
  if (playback.kind === "EMBED" && playback.protocol)
    throw new Error("Embed playback cannot declare a media protocol");
  for (const subtitle of playback.subtitles ?? [])
    validateMediaUrl(subtitle.url, env);
  return { ...playback, url: url.toString() };
}
