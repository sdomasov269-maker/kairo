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

const statuses = [
  "ALL",
  "PLANNED",
  "WATCHING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
] as const;

export default function MyListPage() {
  const { mode, animeList, upsertList, deleteList, clearList } =
    useAccountData();
  const { dictionary: t } = useLocale();
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("ALL");
  const items = useMemo(
    () =>
      animeList
        .filter(
          (item) =>
            item.animeKey.includes(filter.trim().toLowerCase()) &&
            (status === "ALL" || item.status === status),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [animeList, filter, status],
  );

  return (
    <AppShell>
      <main className="account-collection-page">
        <PageContainer className="account-collection-container">
          <PageHero
            title={t.sync.myList}
            description={
              mode.kind === "guest"
                ? t.sync.guestListDescription
                : t.sync.accountListDescription
            }
          />
          <div
            className="account-tabs"
            role="tablist"
            aria-label={t.sync.myList}
          >
            {statuses.map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={status === value}
                className={status === value ? "active" : ""}
                onClick={() => setStatus(value)}
              >
                <span>{value}</span>
                <b>
                  {value === "ALL"
                    ? animeList.length
                    : animeList.filter((item) => item.status === value).length}
                </b>
              </button>
            ))}
          </div>
          <div className="account-toolbar">
            <label className="account-search-field">
              <span className="sr-only">{t.sync.filter}</span>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t.sync.filter}
              />
            </label>
            <button
              className="button button-danger-ghost"
              onClick={() =>
                window.confirm(t.sync.clearListQuestion) && clearList()
              }
            >
              {t.sync.clearList}
            </button>
          </div>
          <SyncStatusIndicator />
          {items.length ? (
            <div className="account-card-grid">
              {items.map((item) => (
                <article
                  className="account-item-card list-card"
                  key={item.animeKey}
                >
                  <h2>
                    <Link href={`/anime/${item.animeKey}`}>
                      {item.animeKey}
                    </Link>
                  </h2>
                  <div className="account-item-actions">
                    <select
                      aria-label={`${item.animeKey} status`}
                      value={item.status}
                      onChange={(event) =>
                        upsertList(
                          item.animeKey,
                          event.target.value as typeof item.status,
                        )
                      }
                    >
                      {statuses.slice(1).map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                    <button
                      className="button button-secondary"
                      onClick={() => deleteList(item.animeKey)}
                    >
                      {t.sync.remove}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t.sync.myList}
              description={
                mode.kind === "guest"
                  ? t.sync.guestListDescription
                  : t.sync.accountListDescription
              }
            />
          )}
        </PageContainer>
      </main>
    </AppShell>
  );
}
