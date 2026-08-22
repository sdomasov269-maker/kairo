import { redirect } from "next/navigation";

export default async function LegacyWatchPage({ params }: PageProps<"/watch/[slug]/[episode]">) {
  const { slug } = await params;
  redirect(`/anime/${encodeURIComponent(slug)}`);
}
