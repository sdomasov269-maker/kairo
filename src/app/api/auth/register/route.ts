import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registrationSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "validation" }, { status: 400 });
  try {
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          passwordHash,
          role: "USER",
        },
      });
      await tx.userPreferences.create({ data: { userId: user.id } });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
