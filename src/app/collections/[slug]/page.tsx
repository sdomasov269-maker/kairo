import { notFound } from "next/navigation";
import { CollectionDetailContent } from "@/components/catalog/DiscoveryPages";
import { AppShell } from "@/components/layout/AppShell";
import { getPublicCatalog } from "@/lib/catalog/public";
import {
  getCollectionDetailData,
  getSystemCollection,
} from "@/lib/catalog/system-collections.server";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getSystemCollection(slug);
  if (!collection) notFound();
  const anime = collection.select(await getPublicCatalog());
  return (
    <AppShell className="app-shell-discovery">
      <CollectionDetailContent
        collection={getCollectionDetailData(collection)}
        anime={anime}
      />
    </AppShell>
  );
}
