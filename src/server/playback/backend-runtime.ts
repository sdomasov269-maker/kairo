import { kodikService } from "@/server/services/kodik.service";
import { SourceAggregator } from "./core/SourceAggregator";
import { SourceScorer } from "./core/SourceScorer";
import { PlaybackService } from "./PlaybackService";
import { KodikProvider } from "./providers/kodik/KodikProvider";
import { KodikWrapperResolver } from "./providers/kodik-wrapper.resolver";
import { InMemoryPlaybackSessionStore } from "./session/InMemoryPlaybackSessionStore";
import { PlaybackSessionManager } from "./session/PlaybackSessionManager";
import { FilesystemSegmentCache } from "./streaming/FilesystemSegmentCache";
import { InMemoryStreamResourceStore } from "./streaming/InMemoryStreamResourceStore";
import { StreamProxy } from "./streaming/StreamProxy";

const resourceStore = new InMemoryStreamResourceStore();
const segmentCache = new FilesystemSegmentCache();
const sessionManager = new PlaybackSessionManager(new InMemoryPlaybackSessionStore(), {
  deleteResources: async (sessionId) => {
    await Promise.all([resourceStore.deleteSession(sessionId), segmentCache.deleteSession(sessionId)]);
  },
});
const providers = [new KodikProvider(kodikService, new KodikWrapperResolver())];

export const playbackBackendRuntime = {
  playbackService: new PlaybackService(new SourceAggregator(providers), new SourceScorer(), sessionManager),
  streamProxy: new StreamProxy(sessionManager, resourceStore, { segmentCache }),
};
