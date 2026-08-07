export type AniLibertyImage = { preview?: unknown; thumbnail?: unknown; optimized?: unknown };
export type AniLibertyRelease = {
  id: number; year?: number | null; alias?: string | null; name?: { main?: string | null; english?: string | null; alternative?: string | null } | null;
  type?: { value?: string; description?: string } | string | null; season?: { value?: string; description?: string } | null;
  poster?: AniLibertyImage | null; description?: string | null; episodes_total?: number | null; is_ongoing?: boolean | null;
  is_in_production?: boolean | null; is_blocked_by_geo?: boolean | null; is_blocked_by_copyrights?: boolean | null;
  updated_at?: string | null; episodes?: AniLibertyEpisode[];
};
export type AniLibertyEpisode = { id: string; release_id?: number; ordinal: number; sort_order?: number; name?: string | null; name_english?: string | null; duration?: number | null; preview?: AniLibertyImage | null; updated_at?: string | null; hls_480?: string | null; hls_720?: string | null; hls_1080?: string | null; rutube_id?: string | null; youtube_id?: string | null };
export type AniLibertySchedule = { data: unknown[] };
export type AniLibertySearchItem = { id: string; alias?: string; titleOriginal?: string; titleEnglish?: string; titleRussian?: string; year?: number; format?: string; description?: string };
export type AniLibertyRejectedSearchItem = { index: number; path: string; reason: string };
export type AniLibertySearchResult = { items: AniLibertySearchItem[]; rejected: AniLibertyRejectedSearchItem[] };
export type AniLibertyPlaybackPolicyStatus = "SUPPORTED" | "PARTNER_PERMISSION_REQUIRED" | "UNSUPPORTED";
export type AniLibertyPlaybackInspection = { status: AniLibertyPlaybackPolicyStatus; sources: [] };
