import { randomUUID } from "node:crypto";
import type { PlaybackCandidate } from "../core/types";
import type { PlaybackSessionStore } from "./PlaybackSessionStore";
import type { PlaybackSession } from "./types";

export const PLAYBACK_SESSION_TTL_MS = 30 * 60 * 1_000;

export type PlaybackSessionContent = {
  animeId: string;
  season?: number;
  episode?: number;
};

type PlaybackSessionManagerOptions = {
  now?: () => Date;
  createId?: () => string;
  ttlMs?: number;
  deleteResources?: (sessionId: string) => Promise<void>;
};

export class PlaybackSessionManager {
  private readonly store: PlaybackSessionStore;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly ttlMs: number;
  private readonly deleteResources?: (sessionId: string) => Promise<void>;

  constructor(store: PlaybackSessionStore, options: PlaybackSessionManagerOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.ttlMs = options.ttlMs ?? PLAYBACK_SESSION_TTL_MS;
    this.deleteResources = options.deleteResources;
  }

  async create(content: PlaybackSessionContent, rankedCandidates: readonly PlaybackCandidate[]): Promise<PlaybackSession | null> {
    const primary = rankedCandidates[0];
    if (!primary) return null;
    const createdAt = this.now();
    const session: PlaybackSession = {
      id: this.createId(),
      content: { ...content },
      createdAt,
      expiresAt: new Date(createdAt.getTime() + this.ttlMs),
      primary: structuredClone(primary),
      fallbacks: structuredClone(rankedCandidates.slice(1)),
    };
    await this.store.set(session);
    return session;
  }

  get(id: string): Promise<PlaybackSession | null> {
    return this.store.get(id);
  }

  async destroy(id: string): Promise<void> {
    await Promise.all([
      this.store.delete(id),
      this.deleteResources?.(id) ?? Promise.resolve(),
    ]);
  }
}
