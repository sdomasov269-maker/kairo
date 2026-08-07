import type { Anime } from "@/types/media";

export type SystemCollectionSlug =
  | "popular"
  | "top-rated"
  | "new-releases"
  | "releasing"
  | "finished"
  | "fantasy"
  | "drama"
  | "adventure"
  | "short-series"
  | "long-series";

export type SystemCollectionTitleKey =
  | "popular"
  | "topRated"
  | "newReleases"
  | "releasing"
  | "finished"
  | "fantasy"
  | "drama"
  | "adventure"
  | "shortSeries"
  | "longSeries";

export type CollectionCardData = {
  slug: SystemCollectionSlug;
  titleKey: SystemCollectionTitleKey;
  anime: Anime[];
  count: number;
};

export type CollectionDetailData = {
  slug: SystemCollectionSlug;
  titleKey: SystemCollectionTitleKey;
};
