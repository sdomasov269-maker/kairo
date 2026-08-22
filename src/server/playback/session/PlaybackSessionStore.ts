import type { PlaybackSession } from "./types";

export interface PlaybackSessionStore {
  get(id: string): Promise<PlaybackSession | null>;
  set(session: PlaybackSession): Promise<void>;
  delete(id: string): Promise<void>;
}
