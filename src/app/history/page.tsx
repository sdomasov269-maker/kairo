"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { SyncStatusIndicator } from "@/components/data/SyncStatusIndicator";
import { useLocale } from "@/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { PageHero } from "@/components/ui/PageHero";
export default function HistoryPage() {
  const { mode, progress, deleteProgress, clearHistory } = useAccountData();
  const { dictionary: t } = useLocale();
  const [filter, setFilter] = useState("");
  const items = useMemo(
    () =>
      progress
        .filter((x) => x.animeSlug.includes(filter.trim().toLowerCase()))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [filter, progress],
  );
  return (
    <AppShell>
      <main className="page-shell">
        <section className="section-block">
          <PageHero
            title={t.sync.history}
            description={
              mode.kind === "guest"
                ? t.sync.guestHistoryDescription
                : t.sync.accountHistoryDescription
            }
          />
          <SyncStatusIndicator />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.sync.filter}
          />
          <button
            onClick={() =>
              window.confirm(t.sync.clearHistoryQuestion) && clearHistory()
            }
          >
            {t.sync.clearHistory}
          </button>
          <div className="catalog-grid">
            {items.map((item) => (
              <article
                className="auth-card"
                key={`${item.animeSlug}-${item.seasonNumber}-${item.episodeNumber}`}
              >
                <h2>{item.animeSlug}</h2>
                <p>
                  {t.sync.episode} {item.episodeNumber} ·{" "}
                  {Math.round(item.percent)}%
                </p>
                <Link href={`/watch/${item.animeSlug}/${item.episodeNumber}`}>
                  {t.sync.continueWatching}
                </Link>
                <button
                  onClick={() =>
                    deleteProgress(
                      item.animeSlug,
                      item.seasonNumber,
                      item.episodeNumber,
                    )
                  }
                >
                  {t.sync.remove}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
