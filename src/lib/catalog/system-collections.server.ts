import "server-only";

import type {
  CollectionCardData,
  CollectionDetailData,
  SystemCollectionSlug,
  SystemCollectionTitleKey,
} from "@/lib/catalog/collections";
import type { Anime } from "@/types/media";

type SystemCollectionDefinition = {
  slug: SystemCollectionSlug;
  titleKey: SystemCollectionTitleKey;
  select: (catalog: Anime[]) => Anime[];
};

const byNewest = (a: Anime, b: Anime) =>
  (b.year ?? 0) - (a.year ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0);
const genre = (name: string) => (catalog: Anime[]) =>
  catalog.filter((anime) =>
    anime.genres.some((item) => item.toLowerCase() === name.toLowerCase()),
  );

const systemCollections: SystemCollectionDefinition[] = [
  {
    slug: "popular",
    titleKey: "popular",
    select: (catalog) =>
      [...catalog].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)),
  },
  {
    slug: "top-rated",
    titleKey: "topRated",
    select: (catalog) =>
      [...catalog]
        .filter((anime) => anime.rating)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  },
  {
    slug: "new-releases",
    titleKey: "newReleases",
    select: (catalog) => [...catalog].sort(byNewest),
  },
  {
    slug: "releasing",
    titleKey: "releasing",
    select: (catalog) =>
      catalog.filter((anime) => anime.status === "RELEASING"),
  },
  {
    slug: "finished",
    titleKey: "finished",
    select: (catalog) => catalog.filter((anime) => anime.status === "FINISHED"),
  },
  { slug: "fantasy", titleKey: "fantasy", select: genre("Fantasy") },
  { slug: "drama", titleKey: "drama", select: genre("Drama") },
  { slug: "adventure", titleKey: "adventure", select: genre("Adventure") },
  {
    slug: "short-series",
    titleKey: "shortSeries",
    select: (catalog) =>
      catalog.filter((anime) => anime.episodes && anime.episodes <= 12),
  },
  {
    slug: "long-series",
    titleKey: "longSeries",
    select: (catalog) =>
      catalog.filter((anime) => anime.episodes && anime.episodes >= 24),
  },
];

export const getSystemCollection = (slug: string) =>
  systemCollections.find((collection) => collection.slug === slug);

export const getCollectionDetailData = (
  definition: SystemCollectionDefinition,
): CollectionDetailData => ({
  slug: definition.slug,
  titleKey: definition.titleKey,
});

export const selectVisibleCollections = (
  catalog: Anime[],
): CollectionCardData[] =>
  systemCollections.flatMap((definition) => {
    const anime = definition.select(catalog);
    if (!anime.length) return [];
    return [
      {
        slug: definition.slug,
        titleKey: definition.titleKey,
        anime,
        count: anime.length,
      },
    ];
  });
