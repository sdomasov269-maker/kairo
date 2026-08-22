import "server-only";
import { InMemoryPlaybackSessionStore } from "./session/InMemoryPlaybackSessionStore";
import { PlaybackSessionManager } from "./session/PlaybackSessionManager";
import { FilesystemSegmentCache } from "./streaming/FilesystemSegmentCache";
import { InMemoryStreamResourceStore } from "./streaming/InMemoryStreamResourceStore";

type PlaybackRuntime = {
  sessionManager: PlaybackSessionManager;
  resourceStore: InMemoryStreamResourceStore;
  segmentCache: FilesystemSegmentCache;
};

const runtimeKey = Symbol.for("kairo.playback.runtime.v2");
const runtimeProcess = process as NodeJS.Process & Record<symbol, PlaybackRuntime | undefined>;

function createPlaybackRuntime(): PlaybackRuntime {
  const resourceStore = new InMemoryStreamResourceStore();
  const segmentCache = new FilesystemSegmentCache();
  return {
    resourceStore,
    segmentCache,
    sessionManager: new PlaybackSessionManager(new InMemoryPlaybackSessionStore(), {
      deleteResources: async (sessionId) => {
        await Promise.all([
          resourceStore.deleteSession(sessionId),
          segmentCache.deleteSession(sessionId),
        ]);
      },
    }),
  };
}

const playbackRuntime = runtimeProcess[runtimeKey] ?? createPlaybackRuntime();
runtimeProcess[runtimeKey] = playbackRuntime;

export const playbackSessionManager = playbackRuntime.sessionManager;
export const streamResourceStore = playbackRuntime.resourceStore;
export const segmentCache = playbackRuntime.segmentCache;
