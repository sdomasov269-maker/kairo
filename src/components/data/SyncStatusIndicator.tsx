"use client";
import Link from "next/link";
import { useAccountData } from "./AccountDataProvider";
import { useLocale } from "@/i18n";
export function SyncStatusIndicator() {
  const { mode, syncStatus, pendingCount } = useAccountData();
  const { dictionary: t } = useLocale();
  if (mode.kind === "guest") return null;
  const label =
    syncStatus === "session-expired"
      ? t.sync.sessionExpired
      : syncStatus === "syncing" || syncStatus === "loading"
        ? t.sync.synchronizing
        : syncStatus === "offline-cache"
          ? t.sync.waitingConnection
          : syncStatus === "error"
            ? t.sync.syncError
            : pendingCount
              ? `${pendingCount} · ${t.sync.queuedChanges}`
              : t.sync.synchronized;
  return (
    <span className="sync-status" role="status">
      {label}
      {syncStatus === "session-expired" && (
        <Link href="/login">{t.sync.signInAgain}</Link>
      )}
    </span>
  );
}
