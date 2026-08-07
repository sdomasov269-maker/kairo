"use client";
import { readQueue, writeQueue } from "./storage";
import type { PendingSyncOperation, PendingSyncType } from "./types";
const group = (type: PendingSyncType) =>
  type.startsWith("progress-")
    ? "progress"
    : type.startsWith("list-")
      ? "list"
      : "preferences";
const forbiddenKey = /password|cookie|token|jwt|secret|url|manifest/i;
function assertSafePayload(value: unknown, depth = 0): void {
  if (depth > 8) throw new Error("Pending payload is too deeply nested");
  if (typeof value === "string" && /^(https?:|data:|blob:)/i.test(value))
    throw new Error("URLs are not allowed in pending payloads");
  if (Array.isArray(value)) {
    value.forEach((item) => assertSafePayload(item, depth + 1));
    return;
  }
  if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKey.test(key))
        throw new Error("Sensitive fields are not allowed in pending payloads");
      assertSafePayload(item, depth + 1);
    }
}
export function enqueue(
  input: Omit<
    PendingSyncOperation,
    "id" | "createdAt" | "attempts" | "nextAttemptAt"
  >,
) {
  assertSafePayload(input.payload);
  let items = readQueue();
  if (input.type.endsWith("-clear"))
    items = items.filter(
      (x) => x.userId !== input.userId || group(x.type) !== group(input.type),
    );
  else if (input.type.endsWith("-delete"))
    items = items.filter(
      (x) =>
        !(
          x.userId === input.userId &&
          x.entityKey === input.entityKey &&
          x.type === input.type.replace("delete", "upsert")
        ),
    );
  else if (
    input.type.endsWith("-upsert") ||
    input.type === "preferences-update"
  )
    items = items.filter(
      (x) =>
        !(
          x.userId === input.userId &&
          x.entityKey === input.entityKey &&
          x.type === input.type
        ),
    );
  const operation: PendingSyncOperation = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: null,
  };
  writeQueue([...items, operation]);
  return operation;
}
export const queueForUser = (userId: string) =>
  readQueue().filter((x) => x.userId === userId);
export function removeOperation(id: string) {
  writeQueue(readQueue().filter((x) => x.id !== id));
}
export function retryDelay(attempts: number) {
  const delays = [5, 15, 45, 120, 300, 900];
  return delays[Math.min(Math.max(0, attempts), delays.length - 1)] * 1000;
}
