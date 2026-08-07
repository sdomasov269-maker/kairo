"use client";

import { ArrowRight, Play } from "lucide-react";
import { AnimeCard, ContinueWatchingCard } from "@/components/anime/Cards";
import { Reveal } from "@/components/effects/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { collections, episodes, watching } from "@/data/catalog";
import type { Collection, Episode } from "@/types/media";
import { useLocale } from "@/i18n";
import type { Anime } from "@/types/media";
import { OverflowMarqueeText } from "@/components/ui/OverflowMarqueeText";
import Link from "next/link";
import { EmptyHeroSection } from "./EmptyHeroSection";

function EpisodeRow({ episode, index }: { episode: Episode; index: number }) {
  const { dictionary: t } = useLocale();
  return (
    <article className="episode-row">
      <span className="episode-number">0{index + 1}</span>
      <div className={`episode-thumb art-${episode.art}`}>
        <div className="poster-mark" />
      </div>
      <div className="episode-main">
        <p>{episode.animeTitle}</p>
        <h3>
          <span>EP {episode.episode}</span>
          <OverflowMarqueeText text={episode.title} />
        </h3>
      </div>
      <div className="episode-release">
        <p>{episode.released}</p>
        <span>
          {episode.audio.language} · {episode.audio.studio}
        </span>
      </div>
      <span className="duration">{episode.duration}</span>
      <button
        className="row-play"
        aria-label={`${t.actions.watch}: ${episode.animeTitle}, ${t.labels.episode} ${episode.episode}`}
      >
        <Play size={17} fill="currentColor" />
      </button>
    </article>
  );
}

function CollectionCard({
  collection,
  index,
  slug,
}: {
  collection: Collection;
  index: number;
  slug: string;
}) {
  return (
    <Link
      className={`collection-card collection-${collection.art}`}
      href={`/collections/${slug}`}
    >
      <span className="collection-no">0{index + 1}</span>
      <div className="collection-orbit" aria-hidden="true" />
      <div>
        <p>{collection.eyebrow}</p>
        <h3>
          <OverflowMarqueeText text={collection.title} />
        </h3>
        <span>{collection.description}</span>
        <span className="collection-card-action" aria-hidden="true">
          <ArrowRight size={20} />
        </span>
      </div>
    </Link>
  );
}

export function ContentSections({ anime }: { anime: Anime[] }) {
  const { dictionary: t } = useLocale();
  return (
    <main>
      <EmptyHeroSection />
      <Reveal className="content-section watching-section">
        <section id="continue" aria-labelledby="continue-title">
          <SectionHeading
            eyebrow={t.sections.yourSpace}
            title={t.sections.continueWatching}
            action={t.sections.history}
          />
          <div className="watching-grid">
            {watching.map((item) => (
              <ContinueWatchingCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      </Reveal>
      <Reveal className="content-section">
        <section id="catalog" aria-labelledby="popular-title">
          <SectionHeading
            eyebrow={t.sections.curated}
            title={t.sections.popular}
            action={t.sections.allTitles}
            actionHref="/catalog"
          />
          <div className="anime-grid">
            {anime.map((item, index) => (
              <AnimeCard anime={item} index={index} key={item.id} />
            ))}
          </div>
        </section>
      </Reveal>
      <Reveal className="content-section episodes-section">
        <section id="new-releases">
          <SectionHeading
            eyebrow={t.sections.updated}
            title={t.sections.newEpisodes}
            action={t.sections.schedule}
            actionHref="/new"
          />
          <div className="episode-list">
            {episodes.map((episode, index) => (
              <EpisodeRow episode={episode} index={index} key={episode.id} />
            ))}
          </div>
        </section>
      </Reveal>
      <Reveal className="content-section collections-section">
        <section id="collections">
          <SectionHeading
            eyebrow={t.sections.mood}
            title={t.sections.collections}
            action={t.discovery.viewAll}
            actionHref="/collections"
          />
          <div className="collection-grid">
            {collections.map((collection, index) => (
              <CollectionCard
                collection={collection}
                index={index}
                slug={
                  ["popular", "top-rated", "new-releases"][index] ?? "popular"
                }
                key={collection.id}
              />
            ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
