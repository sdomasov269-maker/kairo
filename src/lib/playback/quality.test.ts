import assert from "node:assert/strict";
import test from "node:test";
import {
  captureMediaState,
  isCurrentQualitySwitch,
  preserveInitialMediaState,
  providerQualityOptions,
  restoreMediaState,
  selectManualQualitySource,
} from "./quality.ts";

const sources = [
  {
    protocol: "hls" as const,
    url: "https://media.example/720.m3u8",
    quality: 720,
  },
  {
    protocol: "hls" as const,
    url: "https://media.example/360.m3u8",
    quality: 360,
  },
  {
    protocol: "hls" as const,
    url: "https://media.example/480.m3u8",
    quality: 480,
  },
  {
    protocol: "mp4" as const,
    url: "https://media.example/720.mp4",
    quality: 720,
  },
];

test("provider quality options are unique and sorted highest first", () => {
  assert.deepEqual(providerQualityOptions(sources, "hls"), [720, 480, 360]);
});

test("media state preserves time, playback rate, volume and mute", () => {
  const video = {
    currentTime: 642.5,
    duration: 1442,
    paused: false,
    volume: 0.37,
    muted: true,
    playbackRate: 1.5,
  } as HTMLVideoElement;
  const snapshot = captureMediaState(video);
  Object.assign(video, {
    currentTime: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
  });
  restoreMediaState(video, snapshot);
  assert.deepEqual(
    {
      currentTime: video.currentTime,
      volume: video.volume,
      muted: video.muted,
      playbackRate: video.playbackRate,
    },
    { currentTime: 642.5, volume: 0.37, muted: true, playbackRate: 1.5 },
  );
});

test("rapid switches retain the first stable snapshot", () => {
  const initial = {
    currentTime: 30,
    paused: false,
    volume: 0.5,
    muted: false,
    playbackRate: 1.25,
  };
  const clearedVideo = { currentTime: 0 } as HTMLVideoElement;
  assert.equal(preserveInitialMediaState(initial, clearedVideo), initial);
  assert.equal(isCurrentQualitySwitch(360, 360), true);
  assert.equal(isCurrentQualitySwitch(720, 360), false);
});

test("a single source exposes one provider quality behind Auto", () => {
  assert.deepEqual(providerQualityOptions([sources[0]!], "hls"), [720]);
});

test("manual source selection preserves the baseline protocol", () => {
  assert.equal(
    selectManualQualitySource(sources, sources[0]!, 480)?.quality,
    480,
  );
  assert.equal(
    selectManualQualitySource(sources, sources[0]!, 1080),
    undefined,
  );
});
