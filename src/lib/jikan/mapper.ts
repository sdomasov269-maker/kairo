import type { Anime } from "../../types/media.ts";
import { malSlug } from "../catalog/utils.ts";
import { rememberRuntimeAnime } from "../anime/runtime-catalog.ts";
import type { JikanAnime } from "./types";

const status = (value: string | null): string =>
  value === "Currently Airing"
    ? "RELEASING"
    : value === "Finished Airing"
      ? "FINISHED"
      : value === "Not yet aired"
        ? "NOT_YET_RELEASED"
        : "";

const duration = (value: string | null): number | undefined => {
  const match = value?.match(/(\d+)\s*min/i);
  return match ? Number(match[1]) : undefined;
};

export function mapJikanAnime(remote: JikanAnime): Anime {
  const title = remote.title_english ?? remote.title;
  const coverImageLarge =
    remote.images.webp.large_image_url ??
    remote.images.jpg.large_image_url ??
    undefined;
  const coverImage =
    remote.images.webp.image_url ??
    remote.images.jpg.image_url ??
    coverImageLarge;
  return rememberRuntimeAnime({
    id: `mal-${remote.mal_id}`,
    slug: malSlug(remote.mal_id, title),
    malId: remote.mal_id,
    title,
    titleEnglish: remote.title_english ?? undefined,
    titleRomaji: remote.title,
    titleNative: remote.title_japanese ?? undefined,
    synonyms: remote.title_synonyms,
    tagline: "",
    description: remote.synopsis ?? "",
    descriptionEn: remote.synopsis ?? undefined,
    synopsis: remote.synopsis ?? "",
    coverImage,
    coverImageLarge,
    genres: remote.genres.map((genre) => genre.name),
    year:
      remote.year ??
      (remote.aired.from ? Number(remote.aired.from.slice(0, 4)) : undefined),
    season: remote.season?.toUpperCase(),
    format: remote.type?.toUpperCase().replace(" ", "_") ?? undefined,
    status: status(remote.status),
    episodes: remote.episodes ?? undefined,
    duration: duration(remote.duration),
    rating: remote.score ? Math.round(remote.score * 10) : undefined,
    popularity: remote.popularity ?? undefined,
    studios: remote.studios.map((studio) => studio.name),
    country: "JP",
    source: remote.source ?? undefined,
    trailerUrl: remote.trailer?.youtube_id
      ? `https://www.youtube.com/watch?v=${remote.trailer.youtube_id}`
      : undefined,
    art: "eclipse",
  });
}
