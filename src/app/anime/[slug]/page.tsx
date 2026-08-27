import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimeCard } from "@/components/anime/Cards";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { AppShell } from "@/components/layout/AppShell";
import { resolveAnimeBySlug, resolveRelatedAnime } from "@/lib/anime/resolve";
import {
  getLocalizedAnimeTitle,
  localizeGenre,
  resolveLocalizedAnimeDescription,
} from "@/lib/media-localization";
import { AnimePlaybackPanel } from "./AnimePlaybackPanel";
import { resolveHeroImage } from "@/server/services/hero-image.service";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
type AnimePageProps = PageProps<"/anime/[slug]">;
type TitleSizeMode = "short" | "medium" | "long" | "extra-long";

function getTitleSizeMode(title: string): TitleSizeMode {
  const words = title.trim().split(/\s+/u).filter(Boolean);
  const length = Array.from(title.trim()).length;
  const longestWord = Math.max(
    0,
    ...words.map((word) => Array.from(word).length),
  );
  if (length > 52 || words.length >= 8 || longestWord > 22) return "extra-long";
  if (length > 28 || words.length >= 5 || longestWord > 16) return "long";
  if (length > 18 || words.length >= 4) return "medium";
  return "short";
}

export async function generateMetadata({
  params,
}: AnimePageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await resolveAnimeBySlug(slug);
  return anime
    ? { title: `${getLocalizedAnimeTitle(anime, "ru")} — Kairo` }
    : {};
}

export default async function AnimePage({
  params,
  searchParams,
}: AnimePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const anime = await resolveAnimeBySlug(slug);
  if (!anime) notFound();
  const [related, heroImage] = await Promise.all([
    resolveRelatedAnime(anime),
    resolveHeroImage(anime),
  ]);
  const title = getLocalizedAnimeTitle(anime, "ru");
  const titleSize = getTitleSizeMode(title);
  const titleSizeClass = {
    short: styles.titleShort,
    medium: styles.titleMedium,
    long: styles.titleLong,
    "extra-long": styles.titleExtraLong,
  }[titleSize];
  const secondaryTitle =
    anime.titleRomaji && anime.titleRomaji !== title
      ? anime.titleRomaji
      : anime.titleEnglish && anime.titleEnglish !== title
        ? anime.titleEnglish
        : undefined;
  const requestedEpisode = Number(
    Array.isArray(query.episode) ? query.episode[0] : query.episode,
  );
  const initialEpisode =
    Number.isSafeInteger(requestedEpisode) && requestedEpisode > 0
      ? Math.min(requestedEpisode, anime.episodes ?? requestedEpisode)
      : 1;
  const description = resolveLocalizedAnimeDescription(anime, "ru");
  const artwork =
    heroImage?.url ??
    anime.bannerImage ??
    anime.coverImageLarge ??
    anime.coverImage;
  const meta = [
    anime.format,
    anime.year,
    anime.episodes ? `${anime.episodes} серий` : null,
  ].filter(Boolean);
  return (
    <AppShell className={`app-shell-title ${styles.page}`}>
      <main className={styles.main}>
        {artwork ? (
          <div
            className={styles.pageArtwork}
            style={{
              backgroundImage: `url(${JSON.stringify(artwork).slice(1, -1)})`,
              backgroundPosition: `${(heroImage?.cropFocusX ?? 0.68) * 100}% ${(heroImage?.cropFocusY ?? 0.38) * 100}%`,
            }}
          />
        ) : null}
        <section className={styles.hero} aria-labelledby="title-heading">
          <div className={styles.heroCopy} data-title-size={titleSize}>
            <p className={styles.eyebrow}>Kairo / Title</p>
            <h1
              className={`${styles.title} ${titleSizeClass}`}
              id="title-heading"
            >
              {title}
            </h1>
            {secondaryTitle ? (
              <p className={styles.secondary}>{secondaryTitle}</p>
            ) : null}
            <p className={styles.metadata}>{meta.join(" · ")}</p>
            <p className={styles.genres}>
              {anime.genres
                .slice(0, 3)
                .map((genre) => localizeGenre(genre, "ru"))
                .join(" · ")}
            </p>
            <p className={styles.heroDescription}>
              {description.short ??
                description.full ??
                anime.description ??
                "Описание скоро появится."}
            </p>
            <div className={styles.heroActions}>
              <a className={styles.heroPrimaryAction} href="#player">
                {anime.episodes ? `Серия ${initialEpisode}` : "К плееру"}
                <span aria-hidden="true">↓</span>
              </a>
              <a className={styles.heroSecondaryAction} href="#about-heading">
                О тайтле
              </a>
            </div>
          </div>
          <p className={styles.heroIndex} aria-hidden="true">
            <span>01</span> KAIRO / WATCH
          </p>
        </section>
        <div className={styles.content}>
          <section
            className={styles.watchStage}
            id="player"
            aria-labelledby="watch-stage-heading"
          >
            <h2 className="sr-only" id="watch-stage-heading">
              Просмотр и управление
            </h2>
            <AnimePlaybackPanel
              animeSlug={anime.slug}
              shikimoriId={anime.malId}
              initialEpisode={initialEpisode}
              episodeCount={anime.episodes}
              titles={[
                anime.titleRu,
                anime.titleEnglish,
                anime.titleRomaji,
                anime.titleNative,
                anime.title,
              ].filter((value): value is string => Boolean(value))}
              year={anime.year}
              mediaType={anime.format}
              debugSimulateKodikFailure={
                process.env.PLAYBACK_DEBUG_SIMULATION === "1"
                  ? Array.isArray(query.simulateKodikFailure)
                    ? query.simulateKodikFailure[0]
                    : query.simulateKodikFailure
                  : undefined
              }
            />
          </section>
          <section
            className={styles.editorial}
            aria-label="О тайтле и похожие тайтлы"
          >
            <article className={styles.about} aria-labelledby="about-heading">
              <header className={styles.sectionHeading}>
                <span>03</span>
                <div>
                  <p>О тайтле</p>
                  <h2 id="about-heading">{title}</h2>
                </div>
              </header>
              <div className={styles.aboutGrid}>
                <p>
                  {description.full ??
                    description.short ??
                    anime.description ??
                    "Описание пока не добавлено."}
                </p>
                <dl>
                  {anime.studios?.length ? (
                    <>
                      <dt>Студия</dt>
                      <dd>{anime.studios.join(", ")}</dd>
                    </>
                  ) : null}
                  {anime.status ? (
                    <>
                      <dt>Статус</dt>
                      <dd>{anime.status}</dd>
                    </>
                  ) : null}
                  {anime.duration ? (
                    <>
                      <dt>Длительность</dt>
                      <dd>{anime.duration} мин.</dd>
                    </>
                  ) : null}
                  {anime.source ? (
                    <>
                      <dt>Источник</dt>
                      <dd>{anime.source}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            </article>
            {related.length ? (
              <aside
                className={styles.related}
                aria-labelledby="related-heading"
              >
                <header className={styles.relatedHeading}>
                  <p>04 / Продолжить открытие</p>
                  <h2 id="related-heading">Похожие тайтлы</h2>
                </header>
                <KairoWebGLSurface className={styles.relatedGrid}>
                  {related.slice(0, 3).map((item, index) => (
                    <AnimeCard
                      anime={item}
                      index={index}
                      compactHover
                      key={item.id}
                    />
                  ))}
                </KairoWebGLSurface>
              </aside>
            ) : null}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
