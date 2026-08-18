import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const migrations = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>
  >(
    `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name IN ('20260803150000_expand_anime_title_lookup_cache', '20260803150100_expand_anime_title_lookup_cache_fields') ORDER BY migration_name`,
  );
  const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AnimeTitleLookupCache' ORDER BY ordinal_position`,
  );
  const enumValues = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
    `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'AnimeTitleLookupStatus' ORDER BY enumsortorder`,
  );
  const [anime, localizedTitles, lookupCache] = await Promise.all([
    prisma.anime.count(),
    prisma.animeLocalizedTitle.count(),
    prisma.animeTitleLookupCache.count(),
  ]);
  console.log(
    JSON.stringify(
      {
        migrations,
        columns: columns.map((row) => row.column_name),
        enumValues: enumValues.map((row) => row.enumlabel),
        counts: { anime, localizedTitles, lookupCache },
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
