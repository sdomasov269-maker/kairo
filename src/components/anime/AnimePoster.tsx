"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Anime } from "@/types/media";
import { useLocale } from "@/i18n";
import { getLocalizedAnimeTitle } from "@/lib/media-localization";
import { resolveAnimeCover } from "@/lib/catalog/poster";

interface AnimePosterProps {
  anime: Anime;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  backgroundMode?: boolean;
}

export function AnimePoster({
  anime,
  sizes,
  priority = false,
  className = "",
  fill = true,
  backgroundMode = false,
}: AnimePosterProps) {
  const [failed, setFailed] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const { locale } = useLocale();
  const localizedTitle = getLocalizedAnimeTitle(anime, locale);
  const source = resolveAnimeCover(anime);
  useEffect(() => {
    if (!backgroundMode || !source) return;
    const image = new window.Image();
    if (priority) image.fetchPriority = "high";
    image.onload = () => setBackgroundReady(true);
    image.onerror = () => setFailed(true);
    image.src = source;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [backgroundMode, priority, source]);
  const showImage = Boolean(source && !failed);
  const showFallback = !showImage || (backgroundMode && !backgroundReady);
  return (
    <div
      className={`poster art-${anime.art} ${className}`}
      style={
        {
          "--poster-color": anime.dominantColor ?? "#789b98",
        } as React.CSSProperties
      }
    >
      <div className="poster-mark" aria-hidden="true" />
      {showFallback && (
        <span
          className="poster-fallback"
          role="img"
          aria-label={`${locale === "ru" ? "Постер аниме" : locale === "uk" ? "Постер аніме" : "Anime poster"}: ${localizedTitle}`}
        >
          <span className="poster-fallback-mark" aria-hidden="true" />
        </span>
      )}
      {showImage && source && backgroundMode && backgroundReady && (
        <span
          className="poster-background-image"
          role="img"
          aria-label={`${locale === "ru" ? "Постер аниме" : locale === "uk" ? "Постер аніме" : "Anime poster"}: ${localizedTitle}`}
          style={{ backgroundImage: `url(${JSON.stringify(source)})` }}
        />
      )}
      {showImage && source && fill && !backgroundMode && (
        <Image
          src={source}
          alt={`${locale === "ru" ? "Постер аниме" : locale === "uk" ? "Постер аніме" : "Anime poster"}: ${localizedTitle}`}
          fill
          sizes={sizes}
          priority={priority}
          className="poster-image"
          onError={() => setFailed(true)}
        />
      )}
      {showImage && source && !fill && !backgroundMode && (
        <Image
          src={source}
          alt={`${locale === "ru" ? "Постер аниме" : locale === "uk" ? "Постер аніме" : "Anime poster"}: ${localizedTitle}`}
          width={308}
          height={462}
          sizes={sizes}
          priority={priority}
          className="poster-image"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
