import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireUserSession,
  UnauthorizedError,
} from "@/server/auth/require-session";
import { createCommentSchema } from "@/server/validation/comment";

const select = {
  id: true,
  parentId: true,
  seasonNumber: true,
  episodeNumber: true,
  body: true,
  spoiler: true,
  createdAt: true,
  user: { select: { id: true, displayName: true, image: true } },
} as const;

export async function GET(request: Request) {
  const animeId = new URL(request.url).searchParams.get("animeId")?.trim();
  if (!animeId) return NextResponse.json({ comments: [] });
  const comments = await prisma.comment.findMany({
    where: { animeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select,
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const parsed = createCommentSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
    if (parsed.data.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parsed.data.parentId, animeId: parsed.data.animeId },
        select: { id: true },
      });
      if (!parent)
        return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }
    const comment = await prisma.comment.create({
      data: { ...parsed.data, userId: session.userId },
      select,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Comment service unavailable" },
      { status: 503 },
    );
  }
}
