"use client";
import { readQueue, writeQueue } from "./storage";
import { retryDelay } from "./queue";
import type { PendingSyncOperation } from "./types";
const requestFor = (op: PendingSyncOperation): [string, RequestInit] => {
  if (op.type === "progress-upsert")
    return [
      "/api/me/progress",
      { method: "PUT", body: JSON.stringify(op.payload) },
    ];
  if (op.type === "progress-clear")
    return ["/api/me/progress", { method: "DELETE" }];
  if (op.type === "list-upsert")
    return [
      "/api/me/anime-list",
      { method: "PUT", body: JSON.stringify(op.payload) },
    ];
  if (op.type === "list-clear")
    return ["/api/me/anime-list", { method: "DELETE" }];
  if (op.type === "preferences-update")
    return [
      "/api/me/preferences",
      { method: "PUT", body: JSON.stringify(op.payload) },
    ];
  const [animeKey, season, episode] = op.entityKey.split(":");
  return op.type === "list-delete"
    ? [
        `/api/me/anime-list/${encodeURIComponent(animeKey)}`,
        { method: "DELETE" },
      ]
    : [
        `/api/me/progress/${encodeURIComponent(animeKey)}/${season}/${episode}`,
        { method: "DELETE" },
      ];
};
export async function runQueue(userId: string) {
  const all = readQueue();
  for (const op of all.filter((x) => x.userId === userId)) {
    if (op.nextAttemptAt && Date.parse(op.nextAttemptAt) > Date.now()) continue;
    try {
      const [url, init] = requestFor(op);
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 401) return "session-expired" as const;
      if (
        response.ok ||
        (response.status === 404 && op.type.endsWith("-delete")) ||
        [400, 403].includes(response.status)
      ) {
        writeQueue(readQueue().filter((x) => x.id !== op.id));
        continue;
      }
      if (![408, 429].includes(response.status) && response.status < 500)
        continue;
      throw new Error("retryable");
    } catch {
      const attempts = Math.min(20, op.attempts + 1);
      const jitter = Math.floor(Math.random() * 1000);
      writeQueue(
        readQueue().map((x) =>
          x.id === op.id
            ? {
                ...x,
                attempts,
                nextAttemptAt: new Date(
                  Date.now() + retryDelay(attempts - 1) + jitter,
                ).toISOString(),
              }
            : x,
        ),
      );
      return "offline" as const;
    }
  }
  return "complete" as const;
}
