import { AppShell } from "@/components/layout/AppShell";
import { NewReleasesContent } from "@/components/catalog/DiscoveryPages";
import { getPublicCatalogResult } from "@/lib/catalog/public";

export const dynamic = "force-dynamic";

export default async function NewReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status ?? params.filter ?? "all";
  const currentYear = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const season =
    month <= 3
      ? "WINTER"
      : month <= 6
        ? "SPRING"
        : month <= 9
          ? "SUMMER"
          : "FALL";
  const status =
    filter === "ongoing" || filter === "releasing"
      ? "RELEASING"
      : filter === "finished"
        ? "FINISHED"
        : filter === "announced"
          ? "NOT_YET_RELEASED"
          : undefined;
  const catalog = await getPublicCatalogResult({
    sort: filter === "announced" ? "POPULARITY_DESC" : "TRENDING_DESC",
    status,
    season: filter === "season" ? season : undefined,
    seasonYear: filter === "season" ? currentYear : undefined,
    perPage: 36,
  });
  const anime = catalog.anime.filter((item) =>
    filter === "year" ? item.year === currentYear : true,
  );
  return (
    <AppShell className="app-shell-discovery">
      <NewReleasesContent
        anime={anime}
        filter={filter}
        dataSource={catalog.source}
      />
    </AppShell>
  );
}
