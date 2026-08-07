import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUserSession } from "@/server/auth/require-session";
import { applyAniLibertySync, prepareAniLibertySync } from "@/server/media-providers/adapters/aniliberty/sync";

const requestSchema = z.object({ releaseId: z.union([z.string().min(1).max(100), z.number().int().positive()]), confirm: z.literal(true).optional() }).strict();
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string) { const now = Date.now(); const current = attempts.get(key); if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return false; } current.count++; return current.count > 5; }
function sameOrigin(request: Request) { const origin = request.headers.get("origin"); const host = request.headers.get("host"); return Boolean(origin && host && new URL(origin).host === host); }

export async function POST(request: Request) {
  const session = await requireUserSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (rateLimited(session.userId)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues.map((issue) => ({ path: issue.path, code: issue.code })) }, { status: 400 });
  const { release, plan } = await prepareAniLibertySync(prisma, parsed.data.releaseId);
  const apply = parsed.data.confirm === true;
  console.info("[audit] AniLiberty admin import", { userId: session.userId, releaseId: String(parsed.data.releaseId), apply });
  if (!apply) return NextResponse.json({ dryRun: true, plan });
  return NextResponse.json({ dryRun: false, result: await applyAniLibertySync(prisma, release, plan) });
}
