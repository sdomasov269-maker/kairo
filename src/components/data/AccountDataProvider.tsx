"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  emptyPreferences,
  readAccountCache,
  readGuestList,
  readGuestPreferences,
  writeAccountCache,
  writeGuestList,
  writeGuestPreferences,
  type AccountDataStatus,
  type AnimeListEntry,
  type DataMode,
  type PlayerPreferences,
} from "@/lib/account-data";
import {
  clearWatchProgress,
  getProgressSnapshot,
  removeWatchProgress,
  saveWatchProgress,
  type WatchProgressEntry,
} from "@/lib/watch-progress";
import { enqueue, queueForUser, runQueue } from "@/lib/pending-sync";

type ContextValue = {
  mode: DataMode;
  progress: WatchProgressEntry[];
  animeList: AnimeListEntry[];
  preferences: PlayerPreferences;
  syncStatus: AccountDataStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  upsertProgress: (entry: Omit<WatchProgressEntry, "percent">) => void;
  deleteProgress: (slug: string, season: number, episode: number) => void;
  clearHistory: () => void;
  upsertList: (animeKey: string, status: AnimeListEntry["status"]) => void;
  deleteList: (animeKey: string) => void;
  clearList: () => void;
  updatePreferences: (value: PlayerPreferences) => void;
};
const Context = createContext<ContextValue | null>(null);
const unwrap = <T,>(value: T | { ok: true; data: T }): T =>
  value && typeof value === "object" && "ok" in value
    ? (value as { ok: true; data: T }).data
    : (value as T);

export function AccountDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;
  const mode = useMemo<DataMode>(
    () => (userId ? { kind: "account", userId } : { kind: "guest" }),
    [userId],
  );
  const [progress, setProgress] = useState<WatchProgressEntry[]>([]);
  const [animeList, setAnimeList] = useState<AnimeListEntry[]>([]);
  const [preferences, setPreferences] = useState(emptyPreferences);
  const [syncStatus, setSyncStatus] = useState<AccountDataStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const activeRequest = useRef<{
    userId: string;
    promise: Promise<void>;
    controller: AbortController;
  } | null>(null);
  const expiredUser = useRef<string | null>(null);
  const persistCache = useCallback(
    (
      uid: string,
      p: WatchProgressEntry[],
      l: AnimeListEntry[],
      prefs: PlayerPreferences,
      synced: string | null,
    ) => {
      writeAccountCache({
        version: 1,
        userId: uid,
        progress: p,
        animeList: l,
        preferences: prefs,
        lastSyncedAt: synced,
      });
    },
    [],
  );
  const refresh = useCallback(async () => {
    if (!userId) return;
    if (activeRequest.current?.userId === userId)
      return activeRequest.current.promise;
    activeRequest.current?.controller.abort();
    const controller = new AbortController();
    const task = (async () => {
      setSyncStatus("loading");
      const timer = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const responses = await Promise.all([
          fetch("/api/me/progress", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/me/anime-list", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/me/preferences", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        if (responses.some((x) => x.status === 401)) {
          expiredUser.current = userId;
          setSyncStatus("session-expired");
          return;
        }
        if (responses.some((x) => !x.ok)) throw new Error("bootstrap failed");
        const [rawProgress, rawList, rawPreferences] = await Promise.all(
          responses.map((x) => x.json()),
        );
        const p = unwrap<Array<WatchProgressEntry & { animeKey?: string }>>(
          rawProgress,
        ).map((x) => ({ ...x, animeSlug: x.animeSlug ?? x.animeKey! }));
        const l = unwrap<AnimeListEntry[]>(rawList);
        const prefs = {
          ...emptyPreferences,
          ...unwrap<PlayerPreferences>(rawPreferences),
        };
        const synced = new Date().toISOString();
        setProgress(p);
        setAnimeList(l);
        setPreferences(prefs);
        setLastSyncedAt(synced);
        setLoadedUserId(userId);
        persistCache(userId, p, l, prefs, synced);
        setPendingCount(queueForUser(userId).length);
        setSyncStatus("ready");
      } catch {
        const cache = readAccountCache(userId);
        if (cache) {
          setProgress(cache.progress);
          setAnimeList(cache.animeList);
          setPreferences(cache.preferences ?? emptyPreferences);
          setLastSyncedAt(cache.lastSyncedAt);
          setLoadedUserId(userId);
          setSyncStatus("offline-cache");
        } else setSyncStatus("error");
      } finally {
        window.clearTimeout(timer);
      }
    })();
    activeRequest.current = { userId, promise: task, controller };
    await task.finally(() => {
      if (activeRequest.current?.promise === task) activeRequest.current = null;
    });
  }, [persistCache, userId]);
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!userId) {
      expiredUser.current = null;
      const timer = window.setTimeout(() => {
        setProgress(getProgressSnapshot().entries);
        setAnimeList(readGuestList());
        setPreferences(readGuestPreferences());
        setSyncStatus("ready");
        setPendingCount(0);
        setLastSyncedAt(null);
        setLoadedUserId(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    void refresh();
  }, [refresh, sessionStatus, userId]);
  useEffect(() => {
    if (!userId) return;
    const sync = async () => {
      if (expiredUser.current === userId) return;
      setSyncStatus("syncing");
      const result = await runQueue(userId);
      setPendingCount(queueForUser(userId).length);
      if (result === "session-expired") expiredUser.current = userId;
      setSyncStatus(
        result === "session-expired"
          ? "session-expired"
          : result === "offline"
            ? "offline-cache"
            : "ready",
      );
      if (result === "complete") void refresh();
    };
    const online = () => void sync();
    window.addEventListener("online", online);
    const visibility = () =>
      document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", visibility);
    void sync();
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh, userId]);
  useEffect(() => {
    if (
      userId &&
      loadedUserId === userId &&
      !["idle", "loading", "session-expired"].includes(syncStatus)
    ) {
      persistCache(userId, progress, animeList, preferences, lastSyncedAt);
    }
  }, [
    animeList,
    lastSyncedAt,
    loadedUserId,
    persistCache,
    preferences,
    progress,
    syncStatus,
    userId,
  ]);
  const queue = useCallback(
    (
      type: Parameters<typeof enqueue>[0]["type"],
      entityKey: string,
      payload: unknown,
    ) => {
      if (!userId) return;
      enqueue({ userId, type, entityKey, payload });
      setPendingCount(queueForUser(userId).length);
      void runQueue(userId).then((result) => {
        setPendingCount(queueForUser(userId).length);
        if (result === "session-expired") setSyncStatus("session-expired");
        else if (result === "offline") setSyncStatus("offline-cache");
      });
    },
    [userId],
  );
  const value = useMemo<ContextValue>(
    () => ({
      mode,
      progress:
        mode.kind === "account" && loadedUserId !== mode.userId ? [] : progress,
      animeList:
        mode.kind === "account" && loadedUserId !== mode.userId
          ? []
          : animeList,
      preferences,
      syncStatus,
      pendingCount,
      lastSyncedAt,
      refresh,
      upsertProgress: (entry) => {
        const percent = entry.duration
          ? Math.min(100, (entry.currentTime / entry.duration) * 100)
          : 0;
        const next = { ...entry, percent };
        if (!userId) {
          saveWatchProgress(entry);
          setProgress(getProgressSnapshot().entries);
          return;
        }
        setProgress((old) => [
          next,
          ...old.filter(
            (x) =>
              !(
                x.animeSlug === next.animeSlug &&
                x.seasonNumber === next.seasonNumber &&
                x.episodeNumber === next.episodeNumber
              ),
          ),
        ]);
        queue(
          "progress-upsert",
          `${entry.animeSlug}:${entry.seasonNumber}:${entry.episodeNumber}`,
          { ...entry, animeKey: entry.animeSlug },
        );
      },
      deleteProgress: (slug, season, episode) => {
        if (!userId) {
          removeWatchProgress(slug, season, episode);
          setProgress(getProgressSnapshot().entries);
          return;
        }
        setProgress((old) =>
          old.filter(
            (x) =>
              !(
                x.animeSlug === slug &&
                x.seasonNumber === season &&
                x.episodeNumber === episode
              ),
          ),
        );
        queue("progress-delete", `${slug}:${season}:${episode}`, null);
      },
      clearHistory: () => {
        if (!userId) {
          clearWatchProgress();
          setProgress([]);
          return;
        }
        setProgress([]);
        queue("progress-clear", "*", null);
      },
      upsertList: (animeKey, status) => {
        const now = new Date().toISOString();
        setAnimeList((old) => {
          const existing = old.find((x) => x.animeKey === animeKey);
          const next = [
            {
              animeKey,
              status,
              addedAt: existing?.addedAt ?? now,
              updatedAt: now,
            },
            ...old.filter((x) => x.animeKey !== animeKey),
          ];
          if (!userId) writeGuestList(next);
          return next;
        });
        if (userId) queue("list-upsert", animeKey, { animeKey, status });
      },
      deleteList: (animeKey) => {
        setAnimeList((old) => {
          const next = old.filter((x) => x.animeKey !== animeKey);
          if (!userId) writeGuestList(next);
          return next;
        });
        if (userId) queue("list-delete", animeKey, null);
      },
      clearList: () => {
        setAnimeList([]);
        if (userId) queue("list-clear", "*", null);
        else writeGuestList([]);
      },
      updatePreferences: (prefs) => {
        setPreferences(prefs);
        if (userId) queue("preferences-update", "preferences", prefs);
        else writeGuestPreferences(prefs);
      },
    }),
    [
      animeList,
      lastSyncedAt,
      mode,
      pendingCount,
      preferences,
      progress,
      queue,
      refresh,
      syncStatus,
      userId,
      loadedUserId,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccountData() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useAccountData must be used inside AccountDataProvider");
  return value;
}
