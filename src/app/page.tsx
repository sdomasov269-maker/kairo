import { ContentSections } from "@/components/home/ContentSections";
import { AppShell } from "@/components/layout/AppShell";
import { getPublicCatalog } from "@/lib/catalog/public";

export const revalidate = 10800;

export default async function Home() {
  const anime = await getPublicCatalog({ perPage: 50 });

  return (
    <AppShell className="app-shell-home">
      <div className="home-page">
        <ContentSections anime={anime} />
      </div>
    </AppShell>
  );
}
