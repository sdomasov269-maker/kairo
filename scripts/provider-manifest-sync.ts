import { PrismaClient } from "@prisma/client";
import { readProviderManifest } from "../src/server/media-providers/manifest-schema.ts";
import {
  applyManifestSync,
  buildManifestSyncPlan,
} from "../src/server/media-providers/manifest-sync.ts";
const prisma = new PrismaClient();
const rawArgs = process.argv.slice(2);
const file = rawArgs.find((arg) => arg.startsWith("--file="))?.slice(7);
const apply = rawArgs.includes("--apply");
const explicitDryRun = rawArgs.includes("--dry-run");
if (!file)
  throw new Error(
    "Usage: npm run providers:manifest:sync -- --file=<path> [--dry-run|--apply]",
  );
if (apply && explicitDryRun)
  throw new Error("Choose either --dry-run or --apply");
try {
  const manifest = await readProviderManifest(file);
  const plan = await buildManifestSyncPlan(prisma, manifest);
  console.log(
    JSON.stringify(
      { mode: apply ? "apply" : "dry-run", plan, networkRequests: 0 },
      null,
      2,
    ),
  );
  if (!apply) {
    console.log(
      "Dry-run only. No database records were changed. Use --apply explicitly to commit this exact manifest.",
    );
  } else {
    const tables = await prisma.$queryRawUnsafe<Array<{ present: boolean }>>(
      `SELECT to_regclass('public."AnimeMediaProviderConfig"') IS NOT NULL AS present`,
    );
    if (!tables[0]?.present)
      throw new Error(
        "Provider migration is not applied. Run npm run db:migrate and retry; do not use db push or reset.",
      );
    console.log(await applyManifestSync(prisma, manifest, plan));
  }
} finally {
  await prisma.$disconnect();
}
