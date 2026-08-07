"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { SyncStatusIndicator } from "@/components/data/SyncStatusIndicator";
import { useLocale } from "@/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { PageHero } from "@/components/ui/PageHero";
export default function MyListPage() {
  const { mode, animeList, upsertList, deleteList, clearList } =
    useAccountData();
  const { dictionary: t } = useLocale();
  const [filter, setFilter] = useState("");
  const items = useMemo(
    () =>
      animeList
        .filter((item) => item.animeKey.includes(filter.trim().toLowerCase()))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [animeList, filter],
  );
  return (
    <AppShell>
      <main className="page-shell">
        <section className="section-block">
          <PageHero
            title={t.sync.myList}
            description={
              mode.kind === "guest"
                ? t.sync.guestListDescription
                : t.sync.accountListDescription
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
              window.confirm(t.sync.clearListQuestion) && clearList()
            }
          >
            {t.sync.clearList}
          </button>
          <div className="catalog-grid">
            {items.map((item) => (
              <article className="auth-card" key={item.animeKey}>
                <h2>
                  <Link href={`/anime/${item.animeKey}`}>{item.animeKey}</Link>
                </h2>
                <select
                  value={item.status}
                  onChange={(event) =>
                    upsertList(
                      item.animeKey,
                      event.target.value as typeof item.status,
                    )
                  }
                >
                  {[
                    "PLANNED",
                    "WATCHING",
                    "COMPLETED",
                    "PAUSED",
                    "DROPPED",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <button onClick={() => deleteList(item.animeKey)}>
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
