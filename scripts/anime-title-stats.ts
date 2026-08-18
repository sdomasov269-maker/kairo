import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { RETRYABLE_LOOKUP_STATUSES } from "../src/lib/anime-titles/lookup-cache.ts";

const prisma = new PrismaClient();
const maxAttempts = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith("--max-attempts="))
      ?.split("=")[1] ?? 5,
  ),
);

async function main() {
  const [total, ruLocalized, missing] = await Promise.all([
    prisma.anime.count(),
    prisma.animeLocalizedTitle.count({ where: { locale: "RU" } }),
    prisma.anime.findMany({
      where: { localizedTitles: { none: { locale: "RU" } } },
      orderBy: [{ anilistId: "asc" }, { id: "asc" }],
      select: {
        anilistId: true,
        malId: true,
        slug: true,
        titleEnglish: true,
        titleRomaji: true,
        titleNative: true,
      },
    }),
  ]);
  const caches = await prisma.animeTitleLookupCache.findMany({
    where: {
      provider: "shikimori",
      anilistId: { in: missing.map((item) => item.anilistId) },
    },
    orderBy: { updatedAt: "desc" },
  });
  const byId = new Map(caches.map((item) => [item.anilistId, item]));
  const counts: Record<string, number> = {};
  const classifiedMissing = missing.map((anime) => {
    const cache = byId.get(anime.anilistId);
    const metadata = (cache?.metadata ?? {}) as Record<string, unknown>;
    let reason = "SHIKIMORI_NOT_FOUND";
    if (!anime.malId || cache?.status === "NOT_ELIGIBLE") reason = "NO_MAL_ID";
    else if (cache?.status === "AMBIGUOUS") reason = "AMBIGUOUS";
    else if (cache?.status === "CLIENT_ERROR")
      reason = "NON_RETRYABLE_API_ERROR";
    else if (cache?.retryable && cache.attemptCount >= maxAttempts)
      reason = "RETRY_EXHAUSTED";
    else if (
      cache?.retryable &&
      (RETRYABLE_LOOKUP_STATUSES as readonly string[]).includes(cache.status)
    )
      reason = "RETRYABLE_API_ERROR";
    else if (metadata.reason === "empty-russian-title")
      reason = "EMPTY_RUSSIAN_TITLE";
    counts[reason] = (counts[reason] ?? 0) + 1;
    return {
      anilistId: anime.anilistId,
      malId: anime.malId,
      slug: anime.slug,
      english: anime.titleEnglish,
      romaji: anime.titleRomaji,
      native: anime.titleNative,
      reason,
      attemptCount: cache?.attemptCount ?? 0,
    };
  });
  const report = classifiedMissing.filter(
    (item) => item.reason !== "RETRYABLE_API_ERROR",
  );
  await mkdir("reports/anime-title-coverage", { recursive: true });
  await writeFile(
    "reports/anime-title-coverage/missing-ru.json",
    JSON.stringify(report, null, 2),
  );
  console.log(`Anime total: ${total}`);
  console.log(`RU localized: ${ruLocalized}`);
  console.log(`RU missing: ${missing.length}`);
  console.log("RU missing by reason:");
  for (const [reason, count] of Object.entries(counts).sort())
    console.log(`${reason}: ${count}`);
  const errorDistribution = new Map<string, number>();
  for (const cache of caches.filter((item) => item.retryable)) {
    const key = `${cache.status}${cache.lastHttpStatus ? ` HTTP ${cache.lastHttpStatus}` : ""}: ${cache.error ?? "unknown"}`;
    errorDistribution.set(key, (errorDistribution.get(key) ?? 0) + 1);
  }
  console.log("Retryable errors by status/type:");
  for (const [key, count] of [...errorDistribution].sort((a, b) => b[1] - a[1]))
    console.log(`${count} x ${key}`);
  const retryableCaches = caches.filter((item) => item.retryable);
  console.log(
    `Retryable eligible now (<${maxAttempts} attempts): ${retryableCaches.filter((item) => item.attemptCount < maxAttempts && (!item.nextRetryAt || item.nextRetryAt <= new Date())).length}`,
  );
  console.log(
    `Retry attempt range: ${Math.min(...retryableCaches.map((item) => item.attemptCount))}..${Math.max(...retryableCaches.map((item) => item.attemptCount))}`,
  );
  console.log(
    `Retry window: ${
      retryableCaches
        .map((item) => item.nextRetryAt)
        .filter(Boolean)
        .sort((a, b) => a!.getTime() - b!.getTime())[0]
        ?.toISOString() ?? "none"
    }`,
  );
  console.log(`Permanent missing report rows: ${report.length}`);
  console.log("Report: reports/anime-title-coverage/missing-ru.json");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
