import { NextResponse } from "next/server";
import type { CatalogSeason } from "@/lib/catalog";
import { getSeasonAnimePage } from "@/server/services/current-season.service";

const seasons = new Set<CatalogSeason>(["WINTER", "SPRING", "SUMMER", "FALL"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const season = params.get("season") as CatalogSeason | null;
  const year = Number(params.get("year"));
  const offset = Number(params.get("offset"));
  const limit = Number(params.get("limit"));
  if (
    !season ||
    !seasons.has(season) ||
    !Number.isInteger(year) ||
    year < 1940 ||
    year > new Date().getUTCFullYear() + 2
  ) {
    return NextResponse.json(
      { error: "Invalid season request" },
      { status: 400 },
    );
  }
  const result = await getSeasonAnimePage({ season, year }, { offset, limit });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
