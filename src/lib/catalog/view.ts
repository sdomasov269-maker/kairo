import type { CatalogFilters, CatalogSeason } from "./types";

export const CATALOG_VIEWS = ["genres", "season", "episodes", "all"] as const;
export type CatalogView = (typeof CATALOG_VIEWS)[number];

export function parseCatalogView(value: string | string[] | undefined): CatalogView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return CATALOG_VIEWS.includes(candidate as CatalogView)
    ? (candidate as CatalogView)
    : "genres";
}

export function currentCatalogSeason(date = new Date()): {
  season: CatalogSeason;
  year: number;
} {
  const month = date.getMonth() + 1;
  return {
    year: date.getFullYear(),
    season:
      month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL",
  };
}

export function filtersForCatalogView(
  view: CatalogView,
  filters: CatalogFilters,
): CatalogFilters {
  const base = { ...filters, page: 1 };
  if (view === "season") {
    const { season, year } = currentCatalogSeason();
    return { ...base, season, year, status: undefined, sort: "TRENDING_DESC" };
  }
  if (view === "episodes") {
    return {
      ...base,
      year: undefined,
      season: undefined,
      status: "RELEASING",
      sort: "TRENDING_DESC",
    };
  }
  return base;
}
