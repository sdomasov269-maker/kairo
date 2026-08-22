import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { KairoPlaybackEngine } from "./KairoPlaybackEngine.ts";
import type { ShakaAudioTrackLike, ShakaPlayerLike, ShakaRuntime, ShakaTrackLike } from "./types.ts";
import { getPlaybackOverlay } from "../../playback/playback-surface-state.ts";
import { KAIRO_SHAKA_STREAMING_CONFIG } from "./shaka-config.ts";
import { classifyFrameGap, isFrameGap, median, percentile } from "../diagnostics/frame-pacing.ts";
import { isNearSegmentBoundary, measureBufferedRanges } from "../diagnostics/buffer-telemetry.ts";
import { avSkew, boundaryCorrelates, classifyTimestampDelta, durationError, ticksToSeconds, timestampDelta } from "../diagnostics/timestamp-analysis.ts";

class FakeVideo extends EventTarget {
  currentTime = 0;
  duration = 600;
  volume = 1;
  muted = false;
  playbackRate = 1;
  paused = true;
  listenerAdds = 0;
  listenerRemoves = 0;
  buffered: { length: number; start(index: number): number; end(index: number): number } = {
    length: 1,
    start: () => 0,
    end: () => 30,
  };
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    this.listenerAdds += 1;
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    this.listenerRemoves += 1;
    super.removeEventListener(type, callback, options);
  }
  async play() { this.paused = false; this.dispatchEvent(new Event("play")); }
  pause() { this.paused = true; this.dispatchEvent(new Event("pause")); }
}

class FakePlayer extends EventTarget implements ShakaPlayerLike {
  attached = 0;
  loads: string[] = [];
  unloads = 0;
  destroys = 0;
  abrEnabled = true;
  streamingConfiguration = { bufferingGoal: 10, rebufferingGoal: 0, bufferBehind: 30, segmentPrefetchLimit: 1 };
  selectedVariant?: number;
  selectedAudio?: ShakaAudioTrackLike;
  selectedText?: ShakaTrackLike | null;
  variants: ShakaTrackLike[] = [
    { id: 1, height: 720, bandwidth: 2_000_000, videoCodec: "avc1", active: true },
    { id: 2, height: 1080, bandwidth: 4_000_000, videoCodec: "avc1", active: false },
  ];
  audio: ShakaAudioTrackLike[] = [{ language: "ru", label: "Main", active: true }];
  text: ShakaTrackLike[] = [{ id: 9, language: "en", label: "English", kind: "subtitles", active: false }];
  async attach() { this.attached += 1; }
  async load(url: string) { this.loads.push(url); }
  async unload() { this.unloads += 1; }
  async destroy() { this.destroys += 1; }
  getVariantTracks() { return this.variants; }
  getAudioTracks() { return this.audio; }
  getTextTracks() { return this.text; }
  getConfiguration() { return { abr: { enabled: this.abrEnabled }, streaming: this.streamingConfiguration }; }
  configure(config: Parameters<ShakaPlayerLike["configure"]>[0]) {
    if (config.abr?.enabled !== undefined) this.abrEnabled = config.abr.enabled;
    if (config.streaming) this.streamingConfiguration = { ...this.streamingConfiguration, ...config.streaming };
    return true;
  }
  selectVariantTrack(track: ShakaTrackLike) { this.selectedVariant = track.id; }
  selectAudioTrack(track: ShakaAudioTrackLike) { this.selectedAudio = track; }
  selectTextTrack(track?: ShakaTrackLike | null) { this.selectedText = track; }
}

class DeferredLoadPlayer extends FakePlayer {
  resolveLoad?: () => void;
  override async load(url: string) {
    this.loads.push(url);
    await new Promise<void>((resolve) => { this.resolveLoad = resolve; });
  }
}

function fixture(supported = true) {
  const player = new FakePlayer();
  const runtime: ShakaRuntime = { isBrowserSupported: () => supported, createPlayer: () => player };
  return { player, engine: new KairoPlaybackEngine(runtime), video: new FakeVideo() };
}

test("attach, load, replace, destroy, and double destroy are lifecycle-safe", async () => {
  const { engine, player, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  await engine.load({ url: "/api/stream/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/master.m3u8" });
  assert.equal(player.attached, 1);
  assert.deepEqual(player.loads, [
    "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8",
    "/api/stream/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/master.m3u8",
  ]);
  await engine.destroy();
  await engine.destroy();
  assert.equal(player.destroys, 1);
  assert.equal(video.listenerAdds, video.listenerRemoves);
});

test("applies only supported centralized Shaka buffering configuration", async () => {
  const { engine, player, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  assert.deepEqual(player.streamingConfiguration, KAIRO_SHAKA_STREAMING_CONFIG);
  assert.deepEqual(Object.keys(KAIRO_SHAKA_STREAMING_CONFIG).sort(), [
    "bufferBehind", "bufferingGoal", "rebufferingGoal", "segmentPrefetchLimit",
  ]);
});

test("buffer telemetry selects the containing range or the nearest following range", async () => {
  const { engine, video } = fixture();
  video.currentTime = 25;
  video.buffered = {
    length: 2,
    start: (index: number) => [0, 30][index]!,
    end: (index: number) => [10, 42][index]!,
  };
  await engine.attach(video as unknown as HTMLVideoElement);
  assert.equal(engine.snapshot().state.bufferedEnd, 42);
  assert.equal(engine.snapshot().state.bufferedAhead, 12);
  video.currentTime = 35;
  video.dispatchEvent(new Event("timeupdate"));
  assert.equal(engine.snapshot().state.bufferedEnd, 42);
  assert.equal(engine.snapshot().state.bufferedAhead, 7);
});

test("diagnostic helpers classify range gaps, frame cadence, and segment boundaries", () => {
  const ranges = {
    length: 2,
    start: (index: number) => [0, 10.08][index]!,
    end: (index: number) => [10, 20][index]!,
  } as TimeRanges;
  const measured = measureBufferedRanges(ranges, 9);
  assert.equal(measured.bufferedAhead, 1);
  assert.ok(Math.abs((measured.nextBufferedGap ?? 0) - 0.08) < 0.0001);
  assert.equal(isFrameGap(130, 40), true);
  assert.equal(isFrameGap(75, 40), false);
  assert.equal(classifyFrameGap(0.5, false), "BUFFER_STARVATION");
  assert.equal(classifyFrameGap(12, false), "BUFFERED_FRAME_STALL");
  assert.equal(classifyFrameGap(12, true), "SEEK_INDUCED");
  assert.equal(median([40, 42, 41]), 41);
  assert.equal(percentile([1, 2, 3, 4], 0.95), 4);
  assert.equal(isNearSegmentBoundary(20.4, [10, 20, 30]), true);
  assert.equal(isNearSegmentBoundary(20.6, [10, 20, 30]), false);
});

test("timestamp analysis normalizes deltas, overlaps, duration errors, and A/V skew", () => {
  assert.ok(Math.abs((timestampDelta(5.958, 0.042, 6.036) ?? 0) - 0.036) < 0.000001);
  assert.equal(classifyTimestampDelta(0.036), "GAP");
  assert.equal(classifyTimestampDelta(-0.012), "OVERLAP");
  assert.equal(classifyTimestampDelta(0.001), "CONTINUOUS");
  assert.equal(avSkew(6.036, 6.015), 0.020999999999999908);
  assert.ok(Math.abs((durationError(6, 5.964) ?? 0) + 0.036) < 0.000001);
  assert.equal(ticksToSeconds(3_213, { numerator: 1, denominator: 90_000 }), 0.0357);
  assert.equal(ticksToSeconds(1, { numerator: 1, denominator: 0 }), null);
  assert.equal(boundaryCorrelates(-0.035711, 0.035717), true);
  assert.equal(boundaryCorrelates(0.011, 0.2), false);
});

test("normalizes state, buffering, ended, and Shaka errors", async () => {
  const { engine, player, video } = fixture();
  const statuses: string[] = [];
  engine.subscribe("statechange", ({ state }) => statuses.push(state.status));
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  await engine.play();
  video.currentTime = 12;
  video.dispatchEvent(new Event("timeupdate"));
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: true }));
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: false }));
  engine.pause();
  video.dispatchEvent(new Event("ended"));
  player.dispatchEvent(Object.assign(new Event("error"), { detail: { category: 1, severity: 2, code: 1001 } }));
  assert.equal(engine.snapshot().state.error?.code, "NETWORK");
  for (const status of ["loading", "ready", "playing", "buffering", "paused", "ended", "error"])
    assert.equal(statuses.includes(status), true, `missing state ${status}`);
});

test("load completion leaves loading and late subscribers immediately receive ready", async () => {
  const { engine, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  assert.equal(engine.snapshot().state.status, "ready");
  let received: string | undefined;
  engine.subscribe("statechange", ({ state }) => { received = state.status; });
  assert.equal(received, "ready");
  assert.equal(getPlaybackOverlay("ready"), null);
  assert.equal(getPlaybackOverlay("paused"), null);
  assert.equal(getPlaybackOverlay("playing"), null);
});

test("initial buffering remains loading until load resolves, then uses a distinct overlay", async () => {
  const player = new DeferredLoadPlayer();
  const engine = new KairoPlaybackEngine({ isBrowserSupported: () => true, createPlayer: () => player });
  const video = new FakeVideo();
  await engine.attach(video as unknown as HTMLVideoElement);
  const load = engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  await Promise.resolve();
  assert.equal(engine.snapshot().state.status, "loading");
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: true }));
  assert.equal(engine.snapshot().state.status, "loading");
  player.resolveLoad?.();
  await load;
  assert.equal(engine.snapshot().state.status, "buffering");
  assert.equal(getPlaybackOverlay("buffering"), "buffering");
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: false }));
  assert.equal(engine.snapshot().state.status, "ready");
  assert.notEqual(engine.snapshot().state.status, "loading");
});

test("buffering restores playing or paused and never returns to loading", async () => {
  const { engine, player, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  await engine.play();
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: true }));
  assert.equal(engine.snapshot().state.status, "buffering");
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: false }));
  assert.equal(engine.snapshot().state.status, "playing");
  engine.pause();
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: true }));
  player.dispatchEvent(Object.assign(new Event("buffering"), { buffering: false }));
  assert.equal(engine.snapshot().state.status, "paused");
});

test("destroyed stale engine cannot publish load completion into current UI", async () => {
  const player = new DeferredLoadPlayer();
  const engine = new KairoPlaybackEngine({ isBrowserSupported: () => true, createPlayer: () => player });
  const video = new FakeVideo();
  const statuses: string[] = [];
  await engine.attach(video as unknown as HTMLVideoElement);
  engine.subscribe("statechange", ({ state }) => statuses.push(state.status));
  const load = engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  await Promise.resolve();
  await engine.destroy();
  player.resolveLoad?.();
  await load;
  assert.deepEqual(statuses, ["idle", "loading"]);
});

test("controls clamp seek, volume, mute, and playback rate", async () => {
  const { engine, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  engine.seek(900);
  assert.equal(video.currentTime, 600);
  engine.seek(-2);
  assert.equal(video.currentTime, 0);
  engine.setVolume(2);
  assert.equal(video.volume, 1);
  engine.setVolume(-1);
  assert.equal(video.volume, 0);
  engine.setMuted(true);
  engine.setPlaybackRate(1.5);
  assert.equal(video.muted, true);
  assert.equal(video.playbackRate, 1.5);
});

test("normalizes quality, audio, subtitles, and supports ABR selection", async () => {
  const { engine, player, video } = fixture();
  await engine.attach(video as unknown as HTMLVideoElement);
  await engine.load({ url: "/api/stream/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/master.m3u8" });
  const tracks = engine.snapshot().tracks;
  assert.deepEqual(tracks.qualities.map(({ id, height, active }) => ({ id, height, active })), [
    { id: 1, height: 720, active: true }, { id: 2, height: 1080, active: false },
  ]);
  assert.deepEqual(tracks.audio, [{ id: 0, language: "ru", label: "Main", active: true }]);
  assert.deepEqual(tracks.text, [{ id: 9, language: "en", label: "English", kind: "subtitles", active: false }]);
  engine.selectQuality(2);
  assert.equal(player.abrEnabled, false);
  assert.equal(player.selectedVariant, 2);
  engine.setAbrEnabled(true);
  assert.equal(engine.getAbrEnabled(), true);
  engine.selectAudio(0);
  assert.equal(player.selectedAudio, player.audio[0]);
  await engine.selectText(9);
  assert.equal(player.selectedText, player.text[0]);
  await engine.selectText(null);
  assert.equal(player.selectedText, null);
});

test("rejects direct sources, reports unsupported browsers, and has no provider coupling", async () => {
  const supported = fixture();
  await supported.engine.attach(supported.video as unknown as HTMLVideoElement);
  await assert.rejects(supported.engine.load({ url: "https://media.invalid/master.m3u8" }), /Kairo stream URL/);
  const unsupported = fixture(false);
  await unsupported.engine.attach(unsupported.video as unknown as HTMLVideoElement);
  assert.equal(unsupported.engine.snapshot().state.error?.code, "ENGINE_UNSUPPORTED");
  const implementation = (await readFile(new URL("./KairoPlaybackEngine.ts", import.meta.url), "utf8")).toLowerCase();
  for (const provider of ["kodik", "alloha", "cvh", "collaps"]) assert.equal(implementation.includes(provider), false);
});
