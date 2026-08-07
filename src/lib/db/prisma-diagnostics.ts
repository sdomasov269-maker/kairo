export type PrismaFailureKind = "PRISMA_MODEL_UNAVAILABLE" | "DATABASE_UNAVAILABLE" | "TABLE_MISSING" | "QUERY_FAILED";

const warned = new Set<string>();
export function warnOnce(key: string, message: string, details?: unknown, logger: Pick<Console, "warn"> = console) {
  if (warned.has(key)) return false;
  warned.add(key);
  logger.warn(message, details ?? "");
  return true;
}
export function resetPrismaWarningsForTests() { warned.clear(); }

export function assertPrismaDelegate<T extends object, K extends PropertyKey>(client: T, key: K): asserts client is T & Record<K, { findMany: (...args: never[]) => unknown }> {
  const delegate = (client as Record<PropertyKey, unknown>)[key];
  if (!delegate || typeof (delegate as { findMany?: unknown }).findMany !== "function") {
    const available = Object.keys(client).filter((name) => !name.startsWith("_") && typeof (client as Record<string, unknown>)[name] === "object");
    const error = new Error("Prisma Client does not contain AnimeLocalizedTitle. Run prisma generate and restart the server.");
    Object.assign(error, { code: "PRISMA_MODEL_UNAVAILABLE", availableModels: available });
    throw error;
  }
}

export function classifyPrismaFailure(error: unknown): { kind: PrismaFailureKind; message: string } {
  const value = error as { code?: string; message?: string };
  if (value?.code === "PRISMA_MODEL_UNAVAILABLE") return { kind: "PRISMA_MODEL_UNAVAILABLE", message: value.message ?? "Prisma model unavailable" };
  if (value?.code === "P2021" || /table .* does not exist/i.test(value?.message ?? "")) return { kind: "TABLE_MISSING", message: value.message ?? "Database table is missing" };
  if (["P1000", "P1001", "P1002", "P1008", "P1017"].includes(value?.code ?? "") || /connect|connection|database server/i.test(value?.message ?? "")) return { kind: "DATABASE_UNAVAILABLE", message: value.message ?? "Database unavailable" };
  return { kind: "QUERY_FAILED", message: value?.message ?? String(error) };
}
