import { PrismaClient } from "@prisma/client";
import { normalizeAnimeTitleLocale } from "../src/lib/anime-titles/public-list.ts";
import { resolveDisplayAnimeTitle } from "../src/lib/anime-titles/display.ts";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const anilistId = Number(args.get("anilist-id"));
if (!Number.isSafeInteger(anilistId) || anilistId <= 0)
  throw new Error("Provide a valid --anilist-id");
const locale = normalizeAnimeTitleLocale(args.get("locale"));

async function main() {
  const anime = await prisma.anime.findUnique({ where: { anilistId } });
  const rows = await prisma.animeLocalizedTitle.findMany({
    where: { anilistId },
  });
  const ru = rows.find((row) => row.locale === "RU");
  const uk = rows.find((row) => row.locale === "UK");
  const displayTitle = anime
    ? resolveDisplayAnimeTitle({
        locale,
        localizedRu: ru?.title,
        localizedUk: uk?.title,
        base: {
          english: anime.titleEnglish,
          romaji: anime.titleRomaji,
          native: anime.titleNative,
        },
      })
    : null;
  console.log({
    route: "/catalog",
    slug: anime?.slug ?? null,
    anilistId,
    locale,
    animeExists: Boolean(anime),
    localizedRow:
      locale === "ru" ? Boolean(ru) : locale === "uk" ? Boolean(uk) : false,
    localizedTitle:
      locale === "ru"
        ? (ru?.title ?? null)
        : locale === "uk"
          ? (uk?.title ?? null)
          : null,
    localizedSource:
      locale === "ru"
        ? (ru?.source ?? null)
        : locale === "uk"
          ? (uk?.source ?? null)
          : null,
    baseEnglish: anime?.titleEnglish ?? null,
    baseRomaji: anime?.titleRomaji ?? null,
    baseNative: anime?.titleNative ?? null,
    resolvedDisplayTitle: displayTitle,
    catalogMapperOutput: displayTitle,
  });
}

main()
  .catch((error) => {
    console.error(
      "Title trace failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
