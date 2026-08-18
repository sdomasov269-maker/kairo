import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import {
  resolveWatchParty,
  WatchPartyError,
} from "@/server/services/watch-party.service";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/room/${code}`)}`);
  try {
    const room = await resolveWatchParty(code, session.user.id);
    const query = new URLSearchParams({ room: room.code });
    if (room.seasonNumber !== null)
      query.set("season", String(room.seasonNumber));
    if (room.episodeNumber !== null)
      query.set("episode", String(room.episodeNumber));
    redirect(`/anime/${room.slug}?${query.toString()}#watch`);
  } catch (error) {
    if (error instanceof WatchPartyError)
      redirect(`/anime?roomError=not-found`);
    throw error;
  }
}
