import { PrismaClient } from "@prisma/client";
import { AniLibertyClient } from "../src/server/media-providers/adapters/aniliberty/client.ts";
import { applyAniLibertySync, buildAniLibertySyncPlan } from "../src/server/media-providers/adapters/aniliberty/sync.ts";

const prisma = new PrismaClient(); const apply = process.argv.slice(2).includes("--apply"); const client = new AniLibertyClient();
try {
  const schedule = await client.getSchedule();
  const scheduledIds = new Set(schedule.data.map((item) => (item as { id?: unknown; release?: { id?: unknown } }).release?.id ?? (item as { id?: unknown }).id).filter((id): id is string | number => typeof id === "string" || typeof id === "number").map(String));
  const provider = await prisma.animeMediaProviderConfig.findUnique({ where: { key: "aniliberty" } });
  const links = provider ? await prisma.animeMediaProviderLink.findMany({ where: { providerId: provider.id, ...(scheduledIds.size ? { providerAnimeId: { in: [...scheduledIds] } } : {}) }, select: { providerAnimeId: true } }) : [];
  const plans = [];
  for (const link of links) { const release = await client.getTitleById(link.providerAnimeId); const plan = await buildAniLibertySyncPlan(prisma, release); plans.push(plan); if (apply) await applyAniLibertySync(prisma, release, plan); }
  console.log(JSON.stringify({ scheduledReleaseIds: scheduledIds.size, existingLinksChecked: links.length, plans, applied: apply, playbackRequests: 0, fullCatalogScan: false }, null, 2));
} finally { await prisma.$disconnect(); }
