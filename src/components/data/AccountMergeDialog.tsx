"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  GUEST_LIST_KEY,
  GUEST_PREFERENCES_KEY,
  readGuestList,
  readGuestPreferences,
} from "@/lib/account-data";
import { clearWatchProgress, getProgressSnapshot } from "@/lib/watch-progress";
import { useAccountData } from "./AccountDataProvider";
import { useLocale } from "@/i18n";
const decisionKey = (userId: string) => `kairo:merge-decision:v1:${userId}`;
export function AccountMergeDialog() {
  const { data: session, status } = useSession();
  const { refresh } = useAccountData();
  const { dictionary: t } = useLocale();
  const userId = session?.user?.id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    const meaningful =
      getProgressSnapshot().entries.length > 0 ||
      readGuestList().length > 0 ||
      localStorage.getItem(GUEST_PREFERENCES_KEY) !== null;
    const timer = window.setTimeout(
      () => setOpen(meaningful && !localStorage.getItem(decisionKey(userId))),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [status, userId]);
  if (!open || !userId) return null;
  const decide = (value: "account" | "local-only") => {
    localStorage.setItem(decisionKey(userId), value);
    setOpen(false);
  };
  const merge = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/me/merge-local-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: getProgressSnapshot().entries.map((item) => ({
            animeKey: item.animeSlug,
            seasonNumber: item.seasonNumber,
            episodeNumber: item.episodeNumber,
            currentTime: item.currentTime,
            duration: item.duration,
            updatedAt: item.updatedAt,
          })),
          animeList: readGuestList(),
          preferences: readGuestPreferences(),
          preferencesStrategy: "local",
        }),
      });
      if (!response.ok) throw new Error("merge");
      localStorage.setItem(decisionKey(userId), "merged");
      await refresh();
      if (
        window.confirm(
          `${t.sync.mergedSuccessfully}. ${t.sync.clearHistoryQuestion}`,
        )
      ) {
        clearWatchProgress();
        localStorage.removeItem(GUEST_LIST_KEY);
        localStorage.removeItem(GUEST_PREFERENCES_KEY);
      }
      setOpen(false);
    } catch {
      setError(t.sync.localDataSaved);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="auth-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-title"
    >
      <div className="auth-card">
        <h2 id="merge-title">{t.sync.transferQuestion}</h2>
        <p>{t.sync.transferDescription}</p>
        {error && <p role="alert">{error}</p>}
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() => void merge()}
        >
          {t.sync.mergeData}
        </button>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => decide("account")}
        >
          {t.sync.useAccountData}
        </button>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => decide("local-only")}
        >
          {t.sync.continueLocally}
        </button>
        <button disabled={busy} onClick={() => setOpen(false)}>
          {t.sync.cancel}
        </button>
      </div>
    </div>
  );
}
