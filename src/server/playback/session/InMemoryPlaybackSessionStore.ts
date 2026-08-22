import type { PlaybackSessionStore } from "./PlaybackSessionStore";
import type { PlaybackSession } from "./types";

export class InMemoryPlaybackSessionStore implements PlaybackSessionStore {
  private readonly sessions = new Map<string, PlaybackSession>();
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async get(id: string): Promise<PlaybackSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt.getTime() <= this.now().getTime()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  async set(session: PlaybackSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}
