import type { ProviderCapabilities } from "../../types.ts";
import type { AniLibertyPlaybackInspection } from "./types.ts";

export const ANILIBERTY_PLAYBACK_STATUS = "PARTNER_PERMISSION_REQUIRED" as const;
export const anilibertyCapabilities: ProviderCapabilities = { SEARCH: true, ANIME_DETAILS: true, EPISODES: true, DIRECT_MEDIA: false, OFFICIAL_EMBED: false, SUBTITLES: false, AUDIO_VARIANTS: true, UPDATES: true };
export const inspectAniLibertyPlaybackPolicy = (): AniLibertyPlaybackInspection => ({ status: ANILIBERTY_PLAYBACK_STATUS, sources: [] });
