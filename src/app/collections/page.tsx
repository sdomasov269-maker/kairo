import { CollectionsContent } from "@/components/catalog/DiscoveryPages";
import { AppShell } from "@/components/layout/AppShell";
import { getPublicCatalog } from "@/lib/catalog/public";
import { selectVisibleCollections } from "@/lib/catalog/system-collections.server";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const catalog = await getPublicCatalog();
  return (
    <AppShell className="app-shell-discovery">
      <CollectionsContent collections={selectVisibleCollections(catalog)} />
    </AppShell>
  );
}
