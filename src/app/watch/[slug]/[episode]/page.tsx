import { redirect } from "next/navigation";

export default async function LegacyWatchPage({
  params,
  searchParams,
}: PageProps<"/watch/[slug]/[episode]">) {
  const [{ slug, episode }, query] = await Promise.all([params, searchParams]);
  const nextQuery = new URLSearchParams({ episode });
  const season = Array.isArray(query.season) ? query.season[0] : query.season;
  if (season && /^\d{1,3}$/.test(season)) nextQuery.set("season", season);
  redirect(`/anime/${encodeURIComponent(slug)}?${nextQuery.toString()}`);
}
