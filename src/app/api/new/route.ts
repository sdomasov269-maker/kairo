import { NextResponse } from "next/server";
import { getPublicCatalogResult } from "@/lib/catalog/public";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter = params.get("filter") ?? "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1;
  const season = month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL";
  const status =
    filter === "ongoing" || filter === "releasing"
      ? "RELEASING"
      : filter === "finished"
        ? "FINISHED"
        : filter === "announced"
          ? "NOT_YET_RELEASED"
          : undefined;
  const result = await getPublicCatalogResult({
    sort: filter === "announced" ? "POPULARITY_DESC" : "TRENDING_DESC",
    status,
    season: filter === "season" ? season : undefined,
    seasonYear: filter === "season" ? currentYear : undefined,
    perPage: 36,
    page,
  });
  const anime = result.anime.filter((item) =>
    filter === "year" ? item.year === currentYear : true,
  );
  return NextResponse.json({
    anime,
    source: result.source,
    hasMore: result.anime.length === 36,
  });
}
