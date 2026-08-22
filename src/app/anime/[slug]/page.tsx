import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerPlaceholder } from "@/components/anime/PlayerPlaceholder";
import { AppShell } from "@/components/layout/AppShell";
import { resolveAnimeBySlug } from "@/lib/anime/resolve";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
type AnimePageProps = PageProps<"/anime/[slug]">;

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await resolveAnimeBySlug(slug);
  return anime ? { title: `${getLocalizedAnimeTitle(anime, "ru")} — Kairo` } : {};
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { slug } = await params;
  const anime = await resolveAnimeBySlug(slug);
  if (!anime) notFound();
  const title = getLocalizedAnimeTitle(anime, "ru");
  const secondaryTitle = anime.titleRomaji && anime.titleRomaji !== title
    ? anime.titleRomaji
    : anime.titleEnglish && anime.titleEnglish !== title ? anime.titleEnglish : undefined;
  return (
    <AppShell className={styles.page}>
      <main className={styles.main}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Kairo Anime</p>
          <h1 className={styles.title}>{title}</h1>
          {secondaryTitle ? <p className={styles.secondary}>{secondaryTitle}</p> : null}
        </header>
        <PlayerPlaceholder poster={anime.bannerImage ?? anime.coverImageLarge} />
      </main>
    </AppShell>
  );
}
