import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/auth/ProfileContent";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { authOptions } from "@/server/auth/options";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { animeList: true, progress: true } },
    },
  });
  if (!user) redirect("/login");
  return (
    <AppShell>
      <ProfileContent
        displayName={user.displayName}
        email={user.email}
        role={user.role}
        createdAt={user.createdAt.toISOString()}
        lastLoginAt={user.lastLoginAt?.toISOString() ?? null}
        animeListCount={user._count.animeList}
        progressCount={user._count.progress}
      />
    </AppShell>
  );
}
