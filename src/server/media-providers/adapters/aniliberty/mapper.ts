import type {
  ProviderAnimeCandidate,
  ProviderAnimeDetails,
  ProviderEpisode,
} from "../../types.ts";
import type {
  AniLibertyEpisode,
  AniLibertyRelease,
  AniLibertySearchItem,
} from "./types.ts";

const typeValue = (release: AniLibertyRelease) =>
  typeof release.type === "string"
    ? release.type
    : (release.type?.value ?? release.type?.description);
export const mapAniLibertyCandidate = (
  release: AniLibertyRelease,
): ProviderAnimeCandidate => ({
  providerAnimeId: String(release.id),
  title:
    release.name?.main ??
    release.name?.english ??
    release.alias ??
    `AniLiberty ${release.id}`,
  alternativeTitles: [release.name?.english, release.name?.alternative].filter(
    (value): value is string => Boolean(value),
  ),
  year: release.year ?? undefined,
  format: typeValue(release),
  confidence: 0,
});
export const mapAniLibertySearchItem = (
  item: AniLibertySearchItem,
): ProviderAnimeCandidate => ({
  providerAnimeId: item.id,
  title:
    item.titleRussian ??
    item.titleEnglish ??
    item.titleOriginal ??
    item.alias ??
    `AniLiberty ${item.id}`,
  alternativeTitles: [item.titleEnglish, item.titleOriginal].filter(
    (value): value is string => Boolean(value),
  ),
  year: item.year,
  format: item.format,
  confidence: 0,
});
export const mapAniLibertyRelease = (
  release: AniLibertyRelease,
): ProviderAnimeDetails => ({
  ...mapAniLibertyCandidate(release),
  description: release.description ?? undefined,
  episodeCount: release.episodes_total ?? undefined,
  status: release.is_ongoing
    ? "RELEASING"
    : release.is_in_production
      ? "IN_PRODUCTION"
      : "FINISHED",
});
export const availableQualityLabels = (episode: AniLibertyEpisode) =>
  [
    episode.hls_480 && "480p",
    episode.hls_720 && "720p",
    episode.hls_1080 && "1080p",
  ].filter((value): value is string => Boolean(value));
export const mapAniLibertyEpisode = (
  episode: AniLibertyEpisode,
): ProviderEpisode => ({
  providerEpisodeId: episode.id,
  seasonNumber: 1,
  episodeNumber: Math.max(1, Math.trunc(episode.sort_order ?? episode.ordinal)),
  absoluteNumber: Number.isInteger(episode.ordinal)
    ? episode.ordinal
    : undefined,
  title: episode.name_english ?? undefined,
  titleRu: episode.name ?? undefined,
  durationSeconds: episode.duration ?? undefined,
  isPublished:
    availableQualityLabels(episode).length > 0 ||
    Boolean(episode.rutube_id || episode.youtube_id),
  audioVariants: [{ id: "aniliberty-ru", language: "ru", label: "AniLiberty" }],
});
export const episodeReferenceMetadata = (episode: AniLibertyEpisode) => ({
  ordinal: episode.ordinal,
  name: episode.name ?? null,
  duration: episode.duration ?? null,
  preview: episode.preview
    ? {
        preview:
          typeof episode.preview.preview === "string"
            ? episode.preview.preview
            : null,
        thumbnail:
          typeof episode.preview.thumbnail === "string"
            ? episode.preview.thumbnail
            : null,
      }
    : null,
  releaseStatus: availableQualityLabels(episode).length
    ? "AVAILABLE"
    : "UNAVAILABLE",
  availableQualities: availableQualityLabels(episode),
  updatedAt: episode.updated_at ?? null,
});
