import {
  playbackSessionManager,
  segmentCache,
  streamResourceStore,
} from "../playback.runtime";
import { StreamProxy } from "./StreamProxy";

export const streamProxy = new StreamProxy(
  playbackSessionManager,
  streamResourceStore,
  { segmentCache },
);
