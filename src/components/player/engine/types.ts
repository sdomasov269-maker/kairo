export type KairoPlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export type KairoPlaybackErrorCode =
  | "ENGINE_UNSUPPORTED"
  | "LOAD_FAILED"
  | "NETWORK"
  | "MANIFEST"
  | "MEDIA"
  | "UNKNOWN";

export interface KairoPlaybackError {
  code: KairoPlaybackErrorCode;
  fatal: boolean;
}

export interface KairoQualityTrack {
  id: number;
  height?: number;
  bandwidth?: number;
  codec?: string;
  active: boolean;
}

export interface KairoAudioTrack {
  id: string | number;
  language?: string;
  label?: string;
  active: boolean;
}

export interface KairoTextTrack {
  id: number;
  language?: string;
  label?: string;
  kind?: string;
  active: boolean;
}

export interface KairoPlaybackTracks {
  qualities: KairoQualityTrack[];
  audio: KairoAudioTrack[];
  text: KairoTextTrack[];
  abrEnabled: boolean;
}

export interface KairoPlaybackState {
  status: KairoPlaybackStatus;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  bufferedAhead: number;
  buffering: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  error: KairoPlaybackError | null;
}

export interface KairoPlaybackSource {
  url: string;
  type?: "hls";
}

export type KairoPlaybackEvent =
  | "statechange"
  | "timeupdate"
  | "durationchange"
  | "bufferingchange"
  | "trackschange"
  | "error"
  | "ended";

export interface KairoPlaybackSnapshot {
  state: KairoPlaybackState;
  tracks: KairoPlaybackTracks;
}

export type KairoPlaybackListener = (snapshot: KairoPlaybackSnapshot) => void;

export type ShakaTrackLike = {
  id: number;
  active?: boolean;
  height?: number | null;
  bandwidth?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  width?: number | null;
  frameRate?: number | null;
  codecs?: string | null;
  audioId?: number | null;
  language?: string | null;
  label?: string | null;
  roles?: string[] | null;
  kind?: string | null;
};

export type ShakaAudioTrackLike = {
  active?: boolean;
  language?: string;
  label?: string | null;
  roles?: string[];
};

export type ShakaStreamingConfiguration = {
  bufferingGoal: number;
  rebufferingGoal: number;
  bufferBehind: number;
  segmentPrefetchLimit: number;
};

export interface ShakaPlayerLike {
  attach(video: HTMLMediaElement): Promise<unknown>;
  load(url: string): Promise<unknown>;
  unload(): Promise<unknown>;
  destroy(): Promise<unknown>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  getVariantTracks(): ShakaTrackLike[];
  getAudioTracks(): ShakaAudioTrackLike[];
  getTextTracks(): ShakaTrackLike[];
  getConfiguration(): { abr?: { enabled?: boolean }; streaming?: Partial<ShakaStreamingConfiguration> };
  configure(config: { abr?: { enabled?: boolean }; streaming?: Partial<ShakaStreamingConfiguration> }): boolean;
  selectVariantTrack(track: ShakaTrackLike, clearBuffer?: boolean): void;
  selectAudioTrack(track: ShakaAudioTrackLike): void;
  selectTextTrack(track?: ShakaTrackLike | null): void;
}

export interface ShakaRuntime {
  isBrowserSupported(): boolean;
  createPlayer(): ShakaPlayerLike;
}
