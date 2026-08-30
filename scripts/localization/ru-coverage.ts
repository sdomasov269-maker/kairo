import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { animeLocalizationOverridesRu } from "../../src/data/localizations/anime-overrides.ru.ts";

const prisma = new PrismaClient();
try {
  let titles: Array<{
    id: string;
    anilistId: number;
    malId: number | null;
    slug: string;
    country: string | null;
    format: string | null;
    titleEnglish: string | null;
    titleRomaji: string | null;
    titleNative: string | null;
    localizedTitles: Array<{
      title: string;
      source: string;
      confidence: number | null;
      verified: boolean;
      locked: boolean;
    }>;
  }> = await prisma.anime.findMany({
    select: {
      id: true,
      anilistId: true,
      malId: true,
      slug: true,
      country: true,
      format: true,
      titleEnglish: true,
      titleRomaji: true,
      titleNative: true,
      localizedTitles: {
        where: { locale: "RU" },
        select: {
          title: true,
          source: true,
          confidence: true,
          verified: true,
          locked: true,
        },
      },
    },
  });
  let catalogSource = "postgresql";
  if (!titles.length) {
    catalogSource = "local-snapshots";
    const snapshotFiles = await readdir(".data/anime-snapshots").catch(
      () => [],
    );
    const byIdentity = new Map<string, (typeof titles)[number]>();
    for (const file of snapshotFiles.filter((name) => name.endsWith(".json"))) {
      const payload = JSON.parse(
        await readFile(`.data/anime-snapshots/${file}`, "utf8"),
      ) as { anime?: Array<Record<string, unknown>> };
      for (const item of payload.anime ?? []) {
        const anilistId = Number(item.anilistId);
        const slug = String(item.slug ?? `anilist-${anilistId}`);
        const localization = item.localization as
          { ru?: { title?: string; source?: string } } | undefined;
        const titleRu = String(
          localization?.ru?.title ?? item.titleRu ?? "",
        ).trim();
        const key =
          Number.isSafeInteger(anilistId) && anilistId > 0
            ? `anilist:${anilistId}`
            : `slug:${slug}`;
        const next = {
          id: String(item.id ?? key),
          anilistId,
          malId: Number(item.malId) || null,
          slug,
          country: typeof item.country === "string" ? item.country : null,
          format: typeof item.format === "string" ? item.format : null,
          titleEnglish:
            typeof item.titleEnglish === "string"
              ? item.titleEnglish
              : typeof item.title === "string"
                ? item.title
                : null,
          titleRomaji:
            typeof item.titleRomaji === "string" ? item.titleRomaji : null,
          titleNative:
            typeof item.titleNative === "string" ? item.titleNative : null,
          localizedTitles: titleRu
            ? [
                {
                  title: titleRu,
                  source: String(
                    localization?.ru?.source ?? "IMPORTED",
                  ).toUpperCase(),
                  confidence: null,
                  verified: false,
                  locked: false,
                },
              ]
            : [],
        };
        const existing = byIdentity.get(key);
        if (
          !existing ||
          (!existing.localizedTitles.length && next.localizedTitles.length)
        )
          byIdentity.set(key, next);
      }
    }
    titles = [...byIdentity.values()];
  }
  const source: Record<string, number> = {};
  let anime = 0,
    movies = 0,
    westernAnimation = 0;
  const missing: object[] = [];
  const needsReview: object[] = [];
  for (const item of titles) {
    const manual = animeLocalizationOverridesRu[item.anilistId]?.titleRu;
    const localized = manual
      ? {
          title: manual,
          source: "MANUAL",
          confidence: 100,
          verified: true,
          locked: true,
        }
      : item.localizedTitles[0];
    if (item.format === "MOVIE") movies += 1;
    else if (item.country && !["JP", "KR", "CN", "TW"].includes(item.country))
      westernAnimation += 1;
    else anime += 1;
    if (!localized)
      missing.push({
        anilistId: item.anilistId,
        malId: item.malId,
        slug: item.slug,
        reason: item.malId ? "PROVIDER_ERROR_OR_NOT_FOUND" : "NO_MAL_ID",
        aliases: [item.titleEnglish, item.titleRomaji, item.titleNative].filter(
          Boolean,
        ),
      });
    else {
      source[localized.source] = (source[localized.source] ?? 0) + 1;
      if (
        (localized.confidence ?? 0) < 75 &&
        !localized.verified &&
        !localized.locked
      )
        needsReview.push({
          anilistId: item.anilistId,
          slug: item.slug,
          title: localized.title,
          source: localized.source,
          confidence: localized.confidence,
        });
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    catalogSource,
    totalTitles: titles.length,
    russianTitleAvailable: titles.length - missing.length,
    missingRussianTitle: missing.length,
    coveragePercent: titles.length
      ? Number(
          (((titles.length - missing.length) / titles.length) * 100).toFixed(2),
        )
      : 0,
    bySource: source,
    breakdown: { anime, movies, westernAnimation },
    needsReview: needsReview.length + missing.length,
    missing,
  };
  await mkdir("artifacts/localization", { recursive: true });
  await writeFile(
    "artifacts/localization/russian-title-coverage.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    "artifacts/localization/needs-review.json",
    JSON.stringify([...needsReview, ...missing], null, 2),
  );
  const sourceRows =
    Object.entries(source)
      .sort()
      .map(([key, value]) => `| ${key} | ${value} |`)
      .join("\n") || "| — | 0 |";
  await writeFile(
    "artifacts/localization/russian-title-coverage.md",
    `# Покрытие русскими названиями\n\nСформировано: ${report.generatedAt}\n\nИсточник каталога: ${catalogSource}.\n\n- Всего: ${report.totalTitles}\n- С русским названием: ${report.russianTitleAvailable}\n- Без русского названия: ${report.missingRussianTitle}\n- Покрытие: ${report.coveragePercent}%\n- Требуют проверки: ${report.needsReview}\n\n## Типы\n\n| Тип | Количество |\n|---|---:|\n| Аниме и сериалы | ${anime} |\n| Фильмы | ${movies} |\n| Западная анимация | ${westernAnimation} |\n\n## Источники\n\n| Источник | Количество |\n|---|---:|\n${sourceRows}\n`,
  );
  console.log(
    JSON.stringify(
      {
        total: report.totalTitles,
        localized: report.russianTitleAvailable,
        missing: report.missingRussianTitle,
        coveragePercent: report.coveragePercent,
        bySource: source,
        needsReview: report.needsReview,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
