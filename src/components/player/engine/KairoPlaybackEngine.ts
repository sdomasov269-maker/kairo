import type {
  KairoAudioTrack,
  KairoPlaybackError,
  KairoPlaybackEvent,
  KairoPlaybackListener,
  KairoPlaybackSnapshot,
  KairoPlaybackSource,
  KairoPlaybackState,
  KairoPlaybackTracks,
  KairoQualityTrack,
  KairoTextTrack,
  ShakaPlayerLike,
  ShakaRuntime,
} from "./types.ts";
import { KAIRO_SHAKA_STREAMING_CONFIG } from "./shaka-config.ts";
import { measureBufferedRanges } from "../diagnostics/buffer-telemetry.ts";
import { diagnosticsEnabled, PlaybackDiagnostics } from "../diagnostics/PlaybackDiagnostics.ts";

const initialState = (): KairoPlaybackState => ({
  status: "idle",
  currentTime: 0,
  duration: 0,
  bufferedEnd: 0,
  bufferedAhead: 0,
  buffering: false,
  volume: 1,
  muted: false,
  playbackRate: 1,
  error: null,
});

const initialTracks = (): KairoPlaybackTracks => ({ qualities: [], audio: [], text: [], abrEnabled: true });

function isKairoStreamUrl(value: string) {
  try {
    const url = new URL(value, "http://kairo.local");
    return url.origin === "http://kairo.local" && /^\/api\/stream\/[0-9a-f-]+\/master\.m3u8$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeError(error: unknown, fallback: KairoPlaybackError["code"] = "UNKNOWN"): KairoPlaybackError {
  const detail = error && typeof error === "object" && "detail" in error
    ? (error as { detail?: unknown }).detail
    : error;
  const value = detail && typeof detail === "object" ? detail as { category?: number; severity?: number } : {};
  const code = value.category === 1 ? "NETWORK"
    : value.category === 3 ? "MEDIA"
      : value.category === 4 ? "MANIFEST"
        : fallback;
  return { code, fatal: value.severity === undefined || value.severity >= 2 };
}

export class KairoPlaybackEngine {
  private readonly runtime: ShakaRuntime;
  private player: ShakaPlayerLike | null = null;
  private video: HTMLVideoElement | null = null;
  private state = initialState();
  private tracks = initialTracks();
  private readonly listeners = new Map<KairoPlaybackEvent, Set<KairoPlaybackListener>>();
  private generation = 0;
  private destroyed = false;
  private loadInProgress = false;
  private resumeAfterBuffering: "ready" | "playing" | "paused" = "ready";
  private diagnostics: PlaybackDiagnostics | null = null;

  private readonly onTimeUpdate = () => { this.readMediaState(); this.emit("timeupdate"); };
  private readonly onDurationChange = () => { this.readMediaState(); this.emit("durationchange"); };
  private readonly onPlay = () => {
    this.resumeAfterBuffering = "playing";
    if (this.state.status !== "buffering") this.setStatus("playing");
  };
  private readonly onPause = () => {
    if (this.state.status === "ended") return;
    this.resumeAfterBuffering = "paused";
    if (this.state.status !== "buffering") this.setStatus("paused");
  };
  private readonly onEnded = () => { this.setStatus("ended"); this.emit("ended"); };
  private readonly onVolumeChange = () => { this.readMediaState(); this.emit("statechange"); };
  private readonly onRateChange = () => { this.readMediaState(); this.emit("statechange"); };
  private readonly onBuffering = (event: Event) => {
    const buffering = Boolean((event as Event & { buffering?: boolean }).buffering);
    if (this.loadInProgress) {
      this.state = { ...this.state, buffering, status: "loading" };
    } else if (buffering) {
      if (this.state.status === "ready" || this.state.status === "playing" || this.state.status === "paused")
        this.resumeAfterBuffering = this.state.status;
      this.state = { ...this.state, buffering: true, status: "buffering" };
    } else {
      this.state = { ...this.state, buffering: false, status: this.resumeAfterBuffering };
    }
    this.emit("bufferingchange");
    this.emit("statechange");
  };
  private readonly onTracksChanged = () => { this.readTracks(); this.emit("trackschange"); };
  private readonly onError = (event: Event) => {
    const detail = (event as Event & { detail?: { category?: number; code?: number; severity?: number } }).detail;
    if (process.env.NODE_ENV === "development")
      console.info(`[KairoPlayer] error category=${detail?.category ?? "unknown"} code=${detail?.code ?? "unknown"} severity=${detail?.severity ?? "unknown"}`);
    this.fail(normalizeError(event));
  };

  constructor(runtime: ShakaRuntime) {
    this.runtime = runtime;
  }

  async attach(video: HTMLVideoElement) {
    if (this.destroyed) throw new Error("Playback engine is destroyed");
    if (!this.runtime.isBrowserSupported()) {
      if (process.env.NODE_ENV === "development") console.info("[KairoPlayer] browser unsupported");
      this.fail({ code: "ENGINE_UNSUPPORTED", fatal: true });
      return;
    }
    if (this.video === video && this.player) return;
    if (this.player) await this.detachCurrent();
    this.video = video;
    this.addVideoListeners(video);
    const player = this.runtime.createPlayer();
    this.player = player;
    player.configure({ streaming: KAIRO_SHAKA_STREAMING_CONFIG });
    const effective = player.getConfiguration().streaming;
    if (process.env.NODE_ENV === "development") {
      video.dataset.shakaBufferConfig = [
        effective?.bufferingGoal,
        effective?.rebufferingGoal,
        effective?.bufferBehind,
        effective?.segmentPrefetchLimit,
      ].join(",");
      console.info(
        `[KairoBuffer] config bufferingGoal=${effective?.bufferingGoal ?? "unknown"} rebufferingGoal=${effective?.rebufferingGoal ?? "unknown"} bufferBehind=${effective?.bufferBehind ?? "unknown"} segmentPrefetchLimit=${effective?.segmentPrefetchLimit ?? "unknown"}`,
      );
    }
    player.addEventListener("buffering", this.onBuffering);
    player.addEventListener("trackschanged", this.onTracksChanged);
    player.addEventListener("variantchanged", this.onTracksChanged);
    player.addEventListener("textchanged", this.onTracksChanged);
    player.addEventListener("error", this.onError);
    await player.attach(video);
    this.readMediaState();
    if (diagnosticsEnabled(typeof window === "undefined" ? undefined : window.location)) {
      this.diagnostics = new PlaybackDiagnostics(
        video,
        () => this.snapshot(),
        () => player.getVariantTracks().find((track) => track.active),
      );
      this.diagnostics.start();
    }
  }

  async load(source: KairoPlaybackSource) {
    if (!isKairoStreamUrl(source.url)) throw new Error("Playback source must be a Kairo stream URL");
    const player = this.player;
    if (!player || !this.video) throw new Error("Playback engine is not attached");
    const generation = ++this.generation;
    this.loadInProgress = true;
    this.state = { ...this.state, status: "loading", error: null, buffering: false };
    this.emit("statechange");
    try {
      await player.unload();
      if (generation !== this.generation || this.destroyed) return;
      await player.load(source.url);
      if (generation !== this.generation || this.destroyed) return;
      this.readMediaState();
      this.readTracks();
      this.loadInProgress = false;
      this.resumeAfterBuffering = this.video.paused ? "ready" : "playing";
      this.state = { ...this.state, status: this.state.buffering ? "buffering" : this.resumeAfterBuffering };
      this.emit("trackschange");
      this.emit("statechange");
    } catch (error) {
      if (generation === this.generation && !this.destroyed) {
        this.loadInProgress = false;
        this.fail(normalizeError(error, "LOAD_FAILED"));
      }
    }
  }

  async play() {
    if (!this.video) return;
    try {
      await this.video.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      this.fail({ code: "MEDIA", fatal: false });
    }
  }

  pause() { this.video?.pause(); }

  seek(time: number) {
    if (!this.video || !Number.isFinite(time)) return;
    const duration = Number.isFinite(this.video.duration) && this.video.duration >= 0 ? this.video.duration : Number.POSITIVE_INFINITY;
    this.video.currentTime = Math.min(Math.max(0, time), duration);
    this.readMediaState();
    this.emit("timeupdate");
  }

  setVolume(volume: number) {
    if (!this.video || !Number.isFinite(volume)) return;
    this.video.volume = Math.min(1, Math.max(0, volume));
    this.readMediaState();
    this.emit("statechange");
  }

  setMuted(muted: boolean) { if (this.video) { this.video.muted = muted; this.readMediaState(); this.emit("statechange"); } }
  setPlaybackRate(rate: number) { if (this.video && Number.isFinite(rate) && rate > 0) { this.video.playbackRate = rate; this.readMediaState(); this.emit("statechange"); } }
  getAbrEnabled() { return this.tracks.abrEnabled; }
  setAbrEnabled(enabled: boolean) { this.player?.configure({ abr: { enabled } }); this.readTracks(); this.emit("trackschange"); }

  selectQuality(trackId: number) {
    const track = this.player?.getVariantTracks().find((item) => item.id === trackId);
    if (!track || !this.player) return;
    this.player.configure({ abr: { enabled: false } });
    this.player.selectVariantTrack(track, true);
    this.readTracks();
    this.emit("trackschange");
  }

  selectAudio(trackId: string | number) {
    const index = typeof trackId === "number" ? trackId : Number(trackId);
    const track = this.player?.getAudioTracks()[index];
    if (!track || !this.player) return;
    this.player.selectAudioTrack(track);
  }

  async selectText(trackId: number | null) {
    if (!this.player) return;
    if (trackId === null) { this.player.selectTextTrack(null); return; }
    const track = this.player.getTextTracks().find((item) => item.id === trackId);
    if (!track) return;
    this.player.selectTextTrack(track);
  }

  subscribe(event: KairoPlaybackEvent, listener: KairoPlaybackListener) {
    const listeners = this.listeners.get(event) ?? new Set<KairoPlaybackListener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    listener(this.snapshot());
    return () => listeners.delete(listener);
  }

  snapshot(): KairoPlaybackSnapshot {
    return { state: { ...this.state }, tracks: { ...this.tracks, qualities: [...this.tracks.qualities], audio: [...this.tracks.audio], text: [...this.tracks.text] } };
  }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.generation += 1;
    this.loadInProgress = false;
    await this.detachCurrent();
    this.listeners.clear();
    this.state = initialState();
    this.tracks = initialTracks();
  }

  private async detachCurrent() {
    const player = this.player;
    const video = this.video;
    this.diagnostics?.stop();
    this.diagnostics = null;
    this.player = null;
    this.video = null;
    if (video) this.removeVideoListeners(video);
    if (!player) return;
    player.removeEventListener("buffering", this.onBuffering);
    player.removeEventListener("trackschanged", this.onTracksChanged);
    player.removeEventListener("variantchanged", this.onTracksChanged);
    player.removeEventListener("textchanged", this.onTracksChanged);
    player.removeEventListener("error", this.onError);
    await player.unload().catch(() => undefined);
    await player.destroy().catch(() => undefined);
  }

  private addVideoListeners(video: HTMLVideoElement) {
    video.addEventListener("timeupdate", this.onTimeUpdate);
    video.addEventListener("durationchange", this.onDurationChange);
    video.addEventListener("play", this.onPlay);
    video.addEventListener("pause", this.onPause);
    video.addEventListener("ended", this.onEnded);
    video.addEventListener("volumechange", this.onVolumeChange);
    video.addEventListener("ratechange", this.onRateChange);
  }

  private removeVideoListeners(video: HTMLVideoElement) {
    video.removeEventListener("timeupdate", this.onTimeUpdate);
    video.removeEventListener("durationchange", this.onDurationChange);
    video.removeEventListener("play", this.onPlay);
    video.removeEventListener("pause", this.onPause);
    video.removeEventListener("ended", this.onEnded);
    video.removeEventListener("volumechange", this.onVolumeChange);
    video.removeEventListener("ratechange", this.onRateChange);
  }

  private readMediaState() {
    const video = this.video;
    if (!video) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const buffered = measureBufferedRanges(video.buffered, video.currentTime);
    this.state = {
      ...this.state,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
      duration,
      bufferedEnd: buffered.bufferedEnd,
      bufferedAhead: buffered.bufferedAhead,
      volume: video.volume,
      muted: video.muted,
      playbackRate: video.playbackRate,
    };
  }

  private readTracks() {
    const player = this.player;
    if (!player) return;
    const variants = player.getVariantTracks();
    const qualities: KairoQualityTrack[] = variants
      .filter((track) => typeof track.height === "number")
      .map((track) => ({ id: track.id, ...(typeof track.height === "number" ? { height: track.height } : {}), ...(typeof track.bandwidth === "number" ? { bandwidth: track.bandwidth } : {}), ...(track.videoCodec ?? track.codecs ? { codec: track.videoCodec ?? track.codecs ?? undefined } : {}), active: Boolean(track.active) }));
    const audio: KairoAudioTrack[] = player.getAudioTracks().map((track, id) => ({ id, ...(track.language ? { language: track.language } : {}), ...(track.label ? { label: track.label } : {}), active: Boolean(track.active) }));
    const text: KairoTextTrack[] = player.getTextTracks().map((track) => ({ id: track.id, ...(track.language ? { language: track.language } : {}), ...(track.label ? { label: track.label } : {}), ...(track.kind ? { kind: track.kind } : {}), active: Boolean(track.active) }));
    this.tracks = { qualities, audio, text, abrEnabled: player.getConfiguration().abr?.enabled !== false };
  }

  private setStatus(status: KairoPlaybackState["status"]) { this.readMediaState(); this.state = { ...this.state, status }; this.emit("statechange"); }
  private fail(error: KairoPlaybackError) { this.state = { ...this.state, status: "error", buffering: false, error }; this.emit("error"); this.emit("statechange"); }
  private emit(event: KairoPlaybackEvent) { const snapshot = this.snapshot(); for (const listener of this.listeners.get(event) ?? []) listener(snapshot); }
}
