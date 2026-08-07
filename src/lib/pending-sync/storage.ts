"use client";
import type { PendingSyncOperation } from "./types";
const KEY = "kairo:pending-sync:v1";
const types = new Set([
  "progress-upsert",
  "progress-delete",
  "progress-clear",
  "list-upsert",
  "list-delete",
  "list-clear",
  "preferences-update",
]);
const valid = (x: unknown): x is PendingSyncOperation => {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.userId === "string" &&
    types.has(String(v.type)) &&
    typeof v.entityKey === "string" &&
    typeof v.createdAt === "string" &&
    Number.isFinite(Date.parse(v.createdAt)) &&
    Number.isInteger(v.attempts) &&
    Number(v.attempts) >= 0 &&
    Number(v.attempts) <= 20
  );
};
export function readQueue() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const clean = Array.isArray(x) ? x.filter(valid).slice(-300) : [];
    if (!Array.isArray(x) || clean.length !== x.length) writeQueue(clean);
    return clean;
  } catch {
    writeQueue([]);
    return [];
  }
}
export function writeQueue(items: PendingSyncOperation[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(-300)));
}
