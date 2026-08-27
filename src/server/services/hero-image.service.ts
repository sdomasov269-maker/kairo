import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Anime } from "@/types/media";
import {
  chooseBestTmdbBackdrop,
  type TmdbBackdrop,
} from "./hero-image-scoring";

export type HeroImageSource =
  | "manual"
  | "tmdb-tv"
  | "tmdb-tv-season"
  | "tmdb-movie"
  | "anilist-banner"
  | "anilist-cover-derived";

export type HeroImage = {
  url: string;
  source: HeroImageSource;
  score: number;
  cropFocusX: number;
  cropFocusY: number;
};

type TmdbSearchResult = {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  first_air_date?: string;
  release_date?: string;
  popularity?: number;
};

const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function titleSimilarity(candidate: string, titles: string[]) {
  const normalized = normalize(candidate);
  if (!normalized) return 0;
  return Math.max(
    ...titles.map((title) => {
      const wanted = normalize(title);
      if (normalized === wanted) return 1;
      if (normalized.includes(wanted) || wanted.includes(normalized))
        return 0.84;
      const wantedWords = new Set(wanted.split(" "));
      const words = normalized.split(" ");
      return (
        words.filter((word) => wantedWords.has(word)).length /
        Math.max(words.length, wantedWords.size, 1)
      );
    }),
  );
}

function fallback(anime: Anime): HeroImage | null {
  if (anime.bannerImage)
    return {
      url: anime.bannerImage,
      source: "anilist-banner",
      score: 62,
      cropFocusX: 0.68,
      cropFocusY: 0.38,
    };
  const poster = anime.coverImageLarge ?? anime.coverImage;
  return poster
    ? {
        url: poster,
        source: "anilist-cover-derived",
        score: 38,
        cropFocusX: 0.5,
        cropFocusY: 0.28,
      }
    : null;
}

async function tmdbFetch<T>(path: string, key: string): Promise<T | null> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `https://api.themoviedb.org/3${path}${separator}api_key=${encodeURIComponent(key)}`,
    {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 * 60 * 24 * 7 },
    },
  );
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function titlesFor(anime: Anime) {
  return [
    ...new Set(
      [
        anime.title,
        anime.titleEnglish,
        anime.titleRomaji,
        anime.titleNative,
        anime.titleRu,
        ...(anime.synonyms ?? []),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
}

async function findTmdbMatch(anime: Anime, kind: "tv" | "movie", key: string) {
  const titles = titlesFor(anime);
  const candidates = new Map<number, TmdbSearchResult>();
  for (const title of titles.slice(0, 4)) {
    const yearParam = anime.year
      ? `&${kind === "tv" ? "first_air_date_year" : "year"}=${anime.year}`
      : "";
    const data = await tmdbFetch<{ results: TmdbSearchResult[] }>(
      `/search/${kind}?query=${encodeURIComponent(title)}${yearParam}&include_adult=false`,
      key,
    );
    for (const result of data?.results.slice(0, 5) ?? [])
      candidates.set(result.id, result);
    if (candidates.size) break;
  }
  return [...candidates.values()]
    .map((result) => {
      const candidateTitle =
        result.name ??
        result.title ??
        result.original_name ??
        result.original_title ??
        "";
      const candidateYear = Number(
        (result.first_air_date ?? result.release_date ?? "").slice(0, 4),
      );
      const yearScore =
        anime.year && candidateYear
          ? Math.max(0, 1 - Math.abs(anime.year - candidateYear) * 0.22)
          : 0.45;
      return {
        result,
        score:
          titleSimilarity(candidateTitle, titles) * 0.78 +
          yearScore * 0.18 +
          Math.min(0.04, (result.popularity ?? 0) / 5000),
      };
    })
    .filter(({ score }) => score >= 0.66)
    .sort((a, b) => b.score - a.score)[0]?.result;
}

async function resolveFromTmdb(
  anime: Anime,
  key: string,
): Promise<HeroImage | null> {
  const preferredKind = anime.format === "MOVIE" ? "movie" : "tv";
  const kinds: Array<"tv" | "movie"> =
    preferredKind === "tv" ? ["tv", "movie"] : ["movie", "tv"];
  for (const kind of kinds) {
    const match = await findTmdbMatch(anime, kind, key);
    if (!match) continue;
    const images = await tmdbFetch<{ backdrops: TmdbBackdrop[] }>(
      `/${kind}/${match.id}/images?include_image_language=null,en,ja`,
      key,
    );
    let candidates = images?.backdrops ?? [];
    if (kind === "tv") {
      const seasonImages = await tmdbFetch<{ backdrops: TmdbBackdrop[] }>(
        `/tv/${match.id}/season/1/images?include_image_language=null,en,ja`,
        key,
      );
      candidates = candidates.concat(
        (seasonImages?.backdrops ?? []).map((image) => ({
          ...image,
          seasonNumber: 1,
        })),
      );
    }
    const best = chooseBestTmdbBackdrop(candidates);
    if (!best) continue;
    return {
      url: `${TMDB_IMAGE_BASE}${best.image.file_path}`,
      source:
        kind === "movie"
          ? "tmdb-movie"
          : best.image.seasonNumber
            ? "tmdb-tv-season"
            : "tmdb-tv",
      score: best.score,
      cropFocusX: 0.68,
      cropFocusY: 0.38,
    };
  }
  return null;
}

async function persistBestEffort(anime: Anime, hero: HeroImage) {
  if (!anime.anilistId) return;
  try {
    await prisma.anime.updateMany({
      where: { anilistId: anime.anilistId, heroImageApproved: false },
      data: {
        heroImageUrl: hero.url,
        heroImageSource: hero.source,
        heroImageScore: hero.score,
        heroImageUpdatedAt: new Date(),
        heroImageCropFocusX: hero.cropFocusX,
        heroImageCropFocusY: hero.cropFocusY,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.warn("[Hero image] cache write skipped", error);
  }
}

export async function resolveHeroImage(
  anime: Anime,
): Promise<HeroImage | null> {
  if (anime.heroImageApproved && anime.heroImageOverrideUrl)
    return {
      url: anime.heroImageOverrideUrl,
      source: "manual",
      score: 100,
      cropFocusX: anime.heroImageCropFocusX ?? 0.68,
      cropFocusY: anime.heroImageCropFocusY ?? 0.38,
    };
  if (
    anime.heroImageUrl &&
    anime.heroImageUpdatedAt &&
    Date.now() - new Date(anime.heroImageUpdatedAt).getTime() < CACHE_MAX_AGE_MS
  )
    return {
      url: anime.heroImageUrl,
      source: (anime.heroImageSource as HeroImageSource) ?? "anilist-banner",
      score: anime.heroImageScore ?? 0,
      cropFocusX: anime.heroImageCropFocusX ?? 0.68,
      cropFocusY: anime.heroImageCropFocusY ?? 0.38,
    };
  const key = process.env.TMDB_API_KEY;
  if (key) {
    try {
      const tmdb = await resolveFromTmdb(anime, key);
      if (tmdb) {
        await persistBestEffort(anime, tmdb);
        return tmdb;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.warn("[Hero image] TMDB fallback", error);
    }
  }
  const derived = fallback(anime);
  if (derived) await persistBestEffort(anime, derived);
  return derived;
}
