import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const paths = [
  "prisma/migrations/20260803150000_expand_anime_title_lookup_cache/migration.sql",
  "prisma/migrations/20260803150100_expand_anime_title_lookup_cache_fields/migration.sql",
];
const statements = (
  await Promise.all(paths.map((path) => readFile(path, "utf8")))
).flatMap((sql) =>
  sql
    .replace(/--.*$/gm, "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean),
);
try {
  for (const statement of statements) await prisma.$executeRawUnsafe(statement);
  console.log(`Applied ${statements.length} idempotent migration statements.`);
} finally {
  await prisma.$disconnect();
}
