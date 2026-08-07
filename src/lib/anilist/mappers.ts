import type { Anime } from "../../types/media.ts";
import type { AniListMedia } from "./types.ts";
import { anilistSlug } from "../catalog/utils.ts";
import { rememberRuntimeAnime } from "../anime/runtime-catalog.ts";

export function stripAniListHtml(description: string | null): string {
  if (!description) return "";
  return description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function mergeAniListAnime(
  local: Anime,
  remote: AniListMedia | null,
): Anime {
  if (!remote) return local;
  const title =
    local.title ||
    remote.title.english ||
    remote.title.romaji ||
    remote.title.native ||
    `Anime ${remote.id}`;
  return {
    ...local,
    anilistId: remote.id,
    malId: remote.idMal ?? undefined,
    title,
    titleEnglish: remote.title.english ?? local.titleEnglish,
    titleRomaji: remote.title.romaji ?? undefined,
    titleNative: remote.title.native ?? undefined,
    synonyms: remote.synonyms,
    description: local.description || stripAniListHtml(remote.description),
    descriptionEn: stripAniListHtml(remote.description) || undefined,
    synopsis: local.synopsis || stripAniListHtml(remote.description),
    coverImage: remote.coverImage.large ?? undefined,
    coverImageLarge:
      remote.coverImage.extraLarge ?? remote.coverImage.large ?? undefined,
    bannerImage: remote.bannerImage ?? undefined,
    dominantColor: remote.coverImage.color ?? undefined,
    genres: remote.genres.length ? remote.genres : local.genres,
    year: remote.seasonYear ?? local.year,
    season: remote.season ?? undefined,
    format: remote.format ?? undefined,
    status: remote.status ?? local.status,
    episodes: remote.episodes ?? local.episodes,
    duration: remote.duration ?? undefined,
    rating: remote.averageScore ?? remote.meanScore ?? local.rating,
    popularity: remote.popularity ?? undefined,
    studios: remote.studios.nodes.map((studio) => studio.name),
    country: remote.countryOfOrigin ?? undefined,
    source: remote.source ?? undefined,
    trailerUrl:
      remote.trailer?.site === "youtube" &&
      /^[\w-]{6,20}$/.test(remote.trailer.id)
        ? `https://www.youtube.com/watch?v=${remote.trailer.id}`
        : undefined,
    nextAiringEpisode: remote.nextAiringEpisode ?? undefined,
  };
}

export function mergeAnimeBatch(
  local: Anime[],
  remote: AniListMedia[],
): Anime[] {
  const byId = new Map(remote.map((anime) => [anime.id, anime]));
  return local.map((anime) =>
    mergeAniListAnime(
      anime,
      anime.anilistId ? (byId.get(anime.anilistId) ?? null) : null,
    ),
  );
}

export function mapAniListAnime(remote: AniListMedia): Anime {
  const title =
    remote.title.english ??
    remote.title.romaji ??
    remote.title.native ??
    `Anime ${remote.id}`;
  return rememberRuntimeAnime(
    mergeAniListAnime(
      {
        id: `anilist-${remote.id}`,
        slug: anilistSlug(remote.id, title),
        anilistId: remote.id,
        title,
        tagline: "",
        description: "",
        synopsis: "",
        genres: [],
        status: "",
        art: "eclipse",
      },
      remote,
    ),
  );
}
