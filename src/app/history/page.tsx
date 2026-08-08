"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { SyncStatusIndicator } from "@/components/data/SyncStatusIndicator";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/States";
import { PageHero } from "@/components/ui/PageHero";
import { useLocale } from "@/i18n";

export default function HistoryPage() {
  const { mode, progress, deleteProgress, clearHistory } = useAccountData();
  const { dictionary: t } = useLocale();
  const [filter, setFilter] = useState("");
  const items = useMemo(
    () => progress.filter((item) => item.animeSlug.includes(filter.trim().toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [filter, progress],
  );

  return (
    <AppShell>
      <main className="account-collection-page">
        <PageContainer className="account-collection-container">
          <PageHero title={t.sync.history} description={mode.kind === "guest" ? t.sync.guestHistoryDescription : t.sync.accountHistoryDescription} />
          <div className="account-toolbar">
            <label className="account-search-field"><span className="sr-only">{t.sync.filter}</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t.sync.filter} /></label>
            <button className="button button-danger-ghost" onClick={() => window.confirm(t.sync.clearHistoryQuestion) && clearHistory()}>{t.sync.clearHistory}</button>
          </div>
          <SyncStatusIndicator />
          {items.length ? (
            <div className="account-card-grid history-grid">
              {items.map((item) => (
                <article className="account-item-card history-card" key={`${item.animeSlug}-${item.seasonNumber}-${item.episodeNumber}`}>
                  <div className="history-card-art" aria-hidden="true"><span>{Math.round(item.percent)}%</span></div>
                  <div className="account-item-copy">
                    <h2 title={item.animeSlug}>{item.animeSlug}</h2>
                    <p>{t.sync.episode} {item.episodeNumber} · {Math.round(item.percent)}%</p>
                    <div className="account-progress" aria-label={`${Math.round(item.percent)}%`}><i style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }} /></div>
                  </div>
                  <div className="account-item-actions">
                    <Link className="button button-primary" href={`/watch/${item.animeSlug}/${item.episodeNumber}`}>{t.sync.continueWatching}</Link>
                    <button className="button button-secondary" onClick={() => deleteProgress(item.animeSlug, item.seasonNumber, item.episodeNumber)}>{t.sync.remove}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title={t.sync.history} description={mode.kind === "guest" ? t.sync.guestHistoryDescription : t.sync.accountHistoryDescription} />}
        </PageContainer>
      </main>
    </AppShell>
  );
}
