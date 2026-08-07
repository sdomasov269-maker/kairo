import { PrismaClient } from "@prisma/client";
import { applyAniLibertySync, prepareAniLibertySync } from "../src/server/media-providers/adapters/aniliberty/sync.ts";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const id = args.find((arg) => arg.startsWith("--id="))?.slice(5);
const apply = args.includes("--apply");
if (!id) throw new Error("Use --id=<release-id> [--dry-run|--apply]");
try {
  const { release, plan } = await prepareAniLibertySync(prisma, id);
  console.log(JSON.stringify(plan, null, 2));
  if (apply) console.log(await applyAniLibertySync(prisma, release, plan));
  else console.log("Dry-run complete. Database writes: 0");
} finally { await prisma.$disconnect(); }
