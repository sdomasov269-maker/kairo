"use client";

import { ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/i18n";
import type { Anime } from "@/types/media";
import type {
  ReleaseScheduleItem,
  ReleaseScheduleResult,
} from "@/lib/release-schedule/types";
import type { CurrentSeasonResult } from "@/server/services/current-season.service";
import styles from "./HomeFoundation.module.css";
import { HomeSections } from "./HomeSections";
import { HeroStarField } from "./HeroStarField";

export function HomeFoundation({
  anime,
  currentSeason,
  releases,
  schedule,
  releaseDay,
}: {
  anime: Anime[];
  currentSeason: CurrentSeasonResult;
  releases: ReleaseScheduleItem[];
  schedule: ReleaseScheduleResult;
  releaseDay: { date: string; referenceDate: string } | null;
}) {
  const { dictionary: t } = useLocale();

  return (
    <main className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <HeroStarField />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t.hero.brandEyebrow}</p>
          <h1 id="home-title">
            {t.hero.brandTitle.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className={styles.description}>{t.hero.brandDescription}</p>
          <Link className={styles.catalogLink} href="/catalog">
            {t.hero.openCatalog}
            <ArrowDownRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <p className={styles.index} aria-hidden="true">
          <span>01</span> KAIRO / HOME
        </p>
      </section>

      <HomeSections
        anime={anime}
        currentSeason={currentSeason}
        releases={releases}
        releaseDay={releaseDay}
        schedule={schedule}
      />
    </main>
  );
}
