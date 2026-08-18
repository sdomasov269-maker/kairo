import "server-only";
import { prisma } from "@/lib/db";
import { generateRoomCode } from "@/domain/watch-party/room-code";
import { roomCodeSchema } from "@/domain/watch-party/schemas";

const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;
const CREATE_LIMIT = 5;

export class WatchPartyError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "RATE_LIMITED" | "CONFLICT",
  ) {
    super(code);
  }
}

const select = {
  id: true,
  code: true,
  hostUserId: true,
  animeId: true,
  seasonNumber: true,
  episodeNumber: true,
  translationId: true,
  revision: true,
  status: true,
  expiresAt: true,
  anime: { select: { slug: true } },
  host: { select: { displayName: true, image: true } },
} as const;

function dto(room: Awaited<ReturnType<typeof findRaw>>, userId: string) {
  if (!room) throw new WatchPartyError("NOT_FOUND");
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    animeId: room.animeId,
    slug: room.anime.slug,
    seasonNumber: room.seasonNumber,
    episodeNumber: room.episodeNumber,
    translationId: room.translationId,
    revision: room.revision,
    expiresAt: room.expiresAt.toISOString(),
    host: room.host,
    isHost: room.hostUserId === userId,
    channelName: `watch-party:${room.id}`,
  };
}

function findRaw(code: string) {
  return prisma.watchPartyRoom.findUnique({ where: { code }, select });
}

export async function createWatchParty(
  userId: string,
  input: {
    animeId: string;
    slug: string;
    seasonNumber: number | null;
    episodeNumber: number | null;
    translationId: number | null;
  },
) {
  const anime = await prisma.anime.findUnique({
    where: { id: input.animeId },
    select: { slug: true },
  });
  if (!anime || anime.slug !== input.slug)
    throw new WatchPartyError("NOT_FOUND");
  const recent = await prisma.watchPartyRoom.count({
    where: {
      hostUserId: userId,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recent >= CREATE_LIMIT) throw new WatchPartyError("RATE_LIMITED");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const room = await prisma.watchPartyRoom.create({
        data: {
          code: generateRoomCode(),
          hostUserId: userId,
          animeId: input.animeId,
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
          translationId: input.translationId,
          expiresAt: new Date(Date.now() + ROOM_LIFETIME_MS),
        },
        select,
      });
      return dto(room, userId);
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new WatchPartyError("CONFLICT");
}

export async function resolveWatchParty(rawCode: string, userId: string) {
  const parsed = roomCodeSchema.safeParse(rawCode);
  if (!parsed.success) throw new WatchPartyError("NOT_FOUND");
  const room = await findRaw(parsed.data);
  if (!room || room.status !== "ACTIVE") throw new WatchPartyError("NOT_FOUND");
  if (room.expiresAt <= new Date()) {
    await prisma.watchPartyRoom.update({
      where: { id: room.id },
      data: { status: "EXPIRED" },
    });
    throw new WatchPartyError("NOT_FOUND");
  }
  return dto(room, userId);
}

export async function updateWatchParty(
  code: string,
  userId: string,
  input: {
    seasonNumber: number | null;
    episodeNumber: number | null;
    translationId: number | null;
    revision: number;
  },
) {
  const room = await resolveWatchParty(code, userId);
  if (!room.isHost) throw new WatchPartyError("FORBIDDEN");
  const result = await prisma.watchPartyRoom.updateMany({
    where: {
      id: room.id,
      hostUserId: userId,
      status: "ACTIVE",
      revision: { lt: input.revision },
    },
    data: input,
  });
  if (!result.count) throw new WatchPartyError("CONFLICT");
  return resolveWatchParty(code, userId);
}

export async function endWatchParty(code: string, userId: string) {
  const room = await resolveWatchParty(code, userId);
  if (!room.isHost) throw new WatchPartyError("FORBIDDEN");
  await prisma.watchPartyRoom.update({
    where: { id: room.id },
    data: { status: "ENDED", revision: { increment: 1 } },
  });
}
