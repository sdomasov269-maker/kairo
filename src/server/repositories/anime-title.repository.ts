import "server-only";

import type {
  AnimeTitleLocale,
  AnimeTitleSource,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertPrismaDelegate } from "@/lib/db/prisma-diagnostics";
import { normalizeAnimeTitle } from "@/lib/anime-titles/normalize";
import { shouldReplaceLocalizedTitle } from "@/lib/anime-titles/policy";
import {
  classifyLookup,
  computeNextRetryAt,
} from "@/lib/anime-titles/lookup-cache";
import type {
  AnimeTitleLocale as Locale,
  AnimeTitleSource as Source,
  LocalizedTitleResult,
  ProviderLookup,
} from "@/lib/anime-titles/types";

const dbLocale = (locale: Locale): AnimeTitleLocale =>
  locale.toUpperCase() as AnimeTitleLocale;

export async function getLocalizedTitles(anilistId: number) {
  return prisma.animeLocalizedTitle.findMany({ where: { anilistId } });
}

export async function getLocalizedTitle(anilistId: number, locale: Locale) {
  return prisma.animeLocalizedTitle.findUnique({
    where: { anilistId_locale: { anilistId, locale: dbLocale(locale) } },
  });
}

export async function getLocalizedTitlesMap(
  anilistIds: number[],
  locale?: Locale,
) {
  if (!anilistIds.length)
    return new Map<number, { ru?: string; uk?: string; aliases: string[] }>();
  assertPrismaDelegate(prisma, "animeLocalizedTitle");
  const ids = [...new Set(anilistIds)];
  const [titles, aliases] = await Promise.all([
    prisma.animeLocalizedTitle.findMany({
      where: {
        anilistId: { in: ids },
        locale: locale ? dbLocale(locale) : undefined,
      },
    }),
    prisma.animeTitleAlias.findMany({
      where: {
        anilistId: { in: ids },
        OR: locale
          ? [{ locale: dbLocale(locale) }, { locale: null }]
          : undefined,
      },
      select: { anilistId: true, title: true },
    }),
  ]);
  const result = new Map<
    number,
    { ru?: string; uk?: string; aliases: string[] }
  >();
  for (const id of ids) result.set(id, { aliases: [] });
  for (const title of titles) {
    const item = result.get(title.anilistId)!;
    if (title.locale === "RU") item.ru = title.title;
    else item.uk = title.title;
  }
  for (const alias of aliases)
    result.get(alias.anilistId)?.aliases.push(alias.title);
  return result;
}

export async function isTitleLocked(anilistId: number, locale: Locale) {
  const title = await getLocalizedTitle(anilistId, locale);
  return Boolean(title?.locked || title?.source === "MANUAL");
}

export async function findAniListIdsByLocalizedQuery(
  query: string,
  take = 20,
): Promise<number[]> {
  const normalized = normalizeAnimeTitle(query);
  if (!normalized) return [];
  const [titles, aliases] = await Promise.all([
    prisma.animeLocalizedTitle.findMany({
      where: { normalized: { contains: normalized } },
      select: { anilistId: true },
      take,
    }),
    prisma.animeTitleAlias.findMany({
      where: { normalized: { contains: normalized } },
      select: { anilistId: true },
      take,
    }),
  ]);
  return [
    ...new Set([...titles, ...aliases].map((item) => item.anilistId)),
  ].slice(0, take);
}

export async function upsertLocalizedTitle(
  input: LocalizedTitleResult & {
    animeId: string;
    anilistId: number;
    onlyMissing?: boolean;
    dryRun?: boolean;
  },
) {
  const existing = await getLocalizedTitle(input.anilistId, input.locale);
  if (
    !shouldReplaceLocalizedTitle(
      existing
        ? {
            title: existing.title,
            source: existing.source as Source,
            confidence: existing.confidence,
            locked: existing.locked,
          }
        : null,
      input,
      input.onlyMissing,
    )
  ) {
    return {
      saved: false,
      reason: existing?.locked
        ? "locked"
        : existing?.source === "MANUAL"
          ? "manual"
          : "existing",
    } as const;
  }
  if (input.dryRun) return { saved: false, reason: "dry-run" } as const;
  await prisma.animeLocalizedTitle.upsert({
    where: {
      anilistId_locale: {
        anilistId: input.anilistId,
        locale: dbLocale(input.locale),
      },
    },
    create: {
      animeId: input.animeId,
      anilistId: input.anilistId,
      locale: dbLocale(input.locale),
      title: input.title.trim(),
      normalized: normalizeAnimeTitle(input.title),
      source: input.source as AnimeTitleSource,
      confidence: input.confidence,
      externalId: input.externalId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    update: {
      title: input.title.trim(),
      normalized: normalizeAnimeTitle(input.title),
      source: input.source as AnimeTitleSource,
      confidence: input.confidence,
      externalId: input.externalId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return { saved: true, reason: "saved" } as const;
}

export async function saveAliases(input: {
  animeId: string;
  anilistId: number;
  locale?: Locale;
  source: Source;
  externalId?: string;
  titles: string[];
  dryRun?: boolean;
}) {
  if (input.dryRun) return 0;
  const aliases = [
    ...new Map(
      input.titles.map((title) => [normalizeAnimeTitle(title), title.trim()]),
    ).entries(),
  ].filter(([normalized]) => normalized);
  let saved = 0;
  for (const [normalized, title] of aliases) {
    await prisma.animeTitleAlias.upsert({
      where: {
        anilistId_normalized: { anilistId: input.anilistId, normalized },
      },
      create: {
        animeId: input.animeId,
        anilistId: input.anilistId,
        locale: input.locale ? dbLocale(input.locale) : undefined,
        title,
        normalized,
        source: input.source as AnimeTitleSource,
        externalId: input.externalId,
      },
      update: {},
    });
    saved += 1;
  }
  return saved;
}

export async function readProviderCache(
  anilistId: number,
  provider: string,
): Promise<ProviderLookup | null> {
  const cached = await prisma.animeTitleLookupCache.findUnique({
    where: { anilistId_provider: { anilistId, provider } },
  });
  if (!cached || cached.expiresAt <= new Date()) return null;
  const status =
    cached.status === "FOUND"
      ? "found"
      : cached.status === "AMBIGUOUS"
        ? "ambiguous"
        : cached.status === "NOT_ELIGIBLE"
          ? "not-eligible"
          : cached.retryable
            ? "temporary-error"
            : "not-found";
  return {
    status,
    results: (cached.results as LocalizedTitleResult[] | null) ?? [],
    diagnostics: {
      ...((cached.metadata as object) ?? {}),
      ...(cached.error ? { error: cached.error } : {}),
    },
  };
}

export async function writeProviderCache(
  anilistId: number,
  provider: string,
  lookup: ProviderLookup,
) {
  const classified = classifyLookup(lookup);
  const previous = await prisma.animeTitleLookupCache.findUnique({
    where: { anilistId_provider: { anilistId, provider } },
    select: { attemptCount: true },
  });
  const attemptCount =
    classified.status === "FOUND" ? 0 : (previous?.attemptCount ?? 0) + 1;
  const now = new Date();
  const nextRetryAt = classified.retryable
    ? computeNextRetryAt(
        attemptCount,
        now,
        Number(lookup.diagnostics?.retryAfterMs) || null,
      )
    : null;
  const expiresAt = new Date(
    now.getTime() +
      (classified.retryable
        ? 60_000
        : classified.status === "FOUND"
          ? 30 * 86_400_000
          : 7 * 86_400_000),
  );
  const data = {
    status: classified.status,
    results: lookup.results as Prisma.InputJsonValue,
    error: classified.error,
    metadata: (lookup.diagnostics ?? {}) as Prisma.InputJsonValue,
    retryable: classified.retryable,
    attemptCount,
    lastAttemptAt: now,
    nextRetryAt,
    lastHttpStatus: classified.httpStatus,
    expiresAt,
  };
  await prisma.animeTitleLookupCache.upsert({
    where: { anilistId_provider: { anilistId, provider } },
    create: { anilistId, provider, ...data },
    update: data,
  });
}
