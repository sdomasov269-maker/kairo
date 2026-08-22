import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { avSkew, classifyTimestampDelta, durationError } from "./archive-support/timestamp-analysis.ts";

type Packet = { stream_index: number; pts_time?: string; dts_time?: string; duration_time?: string; flags?: string };
type Stream = { index: number; codec_type?: string; codec_name?: string; time_base?: string; avg_frame_rate?: string };
type Probe = { packets?: Packet[]; streams?: Stream[]; format?: { format_name?: string } };

const sessionId = process.argv[2];
const count = Math.min(50, Math.max(2, Number(process.argv[3] ?? 40)));
if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("Usage: analyze-segment-timestamps.ts <session-id> [count]");

const base = `http://localhost:3000/api/stream/${sessionId}`;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const cacheDirectory = join(tmpdir(), "kairo", "playback-cache", hash(`session\0${sessionId}`));
const number = (value: string | undefined) => value === undefined ? null : Number(value);

const manifestResponse = await fetch(`${base}/master.m3u8`);
if (!manifestResponse.ok) throw new Error(`Manifest failed: ${manifestResponse.status}`);
const manifest = await manifestResponse.text();
const lines = manifest.split(/\r?\n/);
const segments: Array<{ index: number; declaredStart: number; declaredDuration: number; token: string; file: string }> = [];
let duration = 0;
let declaredStart = 0;
for (const line of lines) {
  const extinf = /^#EXTINF:([0-9.]+)/.exec(line);
  if (extinf) duration = Number(extinf[1]);
  const resource = /\/resource\/([0-9a-f]+)$/.exec(line);
  if (resource) {
    const token = resource[1]!;
    segments.push({ index: segments.length, declaredStart, declaredDuration: duration, token,
      file: join(cacheDirectory, `${hash(`resource\0${token}`)}.bin`) });
    declaredStart += duration;
  }
}

const selected = segments.slice(0, count);
for (const segment of selected) {
  if (!existsSync(segment.file)) {
    const response = await fetch(`${base}/resource/${segment.token}`);
    if (!response.ok) throw new Error(`Segment ${segment.index} failed: ${response.status}`);
    await response.arrayBuffer();
  }
  if (!existsSync(segment.file)) throw new Error(`Segment ${segment.index} missing from cache`);
}

function probe(file: string): Probe {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_packets", "-of", "json", file],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe exited ${result.status}`);
  return JSON.parse(result.stdout) as Probe;
}

function analyzePackets(packets: Packet[]) {
  const pts = packets.map((packet) => number(packet.pts_time)).filter((value): value is number => value !== null);
  const dts = packets.map((packet) => number(packet.dts_time)).filter((value): value is number => value !== null);
  const ptsEnds = packets.map((packet) => {
    const pts = number(packet.pts_time);
    const packetDuration = number(packet.duration_time);
    return pts === null || packetDuration === null ? null : pts + packetDuration;
  }).filter((value): value is number => value !== null);
  const dtsEnds = packets.map((packet) => {
    const dts = number(packet.dts_time);
    const packetDuration = number(packet.duration_time);
    return dts === null || packetDuration === null ? null : dts + packetDuration;
  }).filter((value): value is number => value !== null);
  return {
    firstPts: pts.length ? Math.min(...pts) : null,
    lastPts: pts.length ? Math.max(...pts) : null,
    firstDts: dts.at(0) ?? null,
    lastDts: dts.at(-1) ?? null,
    ptsEnd: ptsEnds.length ? Math.max(...ptsEnds) : null,
    dtsEnd: dtsEnds.length ? Math.max(...dtsEnds) : null,
    actualDuration: pts.length && ptsEnds.length ? Math.max(...ptsEnds) - Math.min(...pts) : null,
    monotonicDts: dts.every((value, index) => index === 0 || value > dts[index - 1]!),
    duplicateDts: dts.some((value, index) => index > 0 && value === dts[index - 1]),
    startsWithKeyframe: Boolean(packets[0]?.flags?.includes("K")),
    keyframes: packets.filter((packet) => packet.flags?.includes("K")).map((packet) => number(packet.pts_time)).filter((value): value is number => value !== null),
    firstPackets: packets.slice(0, 4).map((packet) => ({ pts: number(packet.pts_time), dts: number(packet.dts_time), duration: number(packet.duration_time), flags: packet.flags })),
    lastPackets: packets.slice(-4).map((packet) => ({ pts: number(packet.pts_time), dts: number(packet.dts_time), duration: number(packet.duration_time), flags: packet.flags })),
  };
}

const analyzed = selected.map((segment) => {
  const result = probe(segment.file);
  const videoStream = result.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = result.streams?.find((stream) => stream.codec_type === "audio");
  const packets = result.packets ?? [];
  const video = analyzePackets(packets.filter((packet) => packet.stream_index === videoStream?.index));
  const audio = analyzePackets(packets.filter((packet) => packet.stream_index === audioStream?.index));
  return { ...segment, token: segment.token.slice(0, 8), container: result.format?.format_name,
    videoStream, audioStream, video, audio,
    videoDurationError: durationError(segment.declaredDuration, video.actualDuration),
    audioDurationError: durationError(segment.declaredDuration, audio.actualDuration) };
});

let remux: null | { artifact: string; encodedStreamChanged: false; maxPresentationIntervals: number[]; ffmpegStderr: string } = null;
if (process.argv.includes("--remux")) {
  const artifact = join(tmpdir(), `kairo-timestamp-remux-${sessionId.slice(0, 8)}.mp4`);
  const concatInput = `concat:${selected.map((segment) => segment.file.replaceAll("\\", "/")).join("|")}`;
  const result = spawnSync("ffmpeg", ["-v", "warning", "-y", "-i", concatInput, "-map", "0:v:0", "-map", "0:a:0", "-c", "copy", "-movflags", "+faststart", artifact],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg exited ${result.status}`);
  const remuxProbe = probe(artifact);
  const videoIndex = remuxProbe.streams?.find((stream) => stream.codec_type === "video")?.index;
  const presentationTimes = (remuxProbe.packets ?? []).filter((packet) => packet.stream_index === videoIndex)
    .map((packet) => number(packet.pts_time)).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const intervals = presentationTimes.slice(1).map((value, index) => value - presentationTimes[index]!).sort((a, b) => b - a);
  remux = { artifact, encodedStreamChanged: false, maxPresentationIntervals: intervals.slice(0, 10), ffmpegStderr: result.stderr.trim() };
}

const boundaries = analyzed.slice(1).map((next, index) => {
  const previous = analyzed[index]!;
  const videoPtsDelta = previous.video.ptsEnd === null || next.video.firstPts === null ? null : next.video.firstPts - previous.video.ptsEnd;
  const videoDtsDelta = previous.video.dtsEnd === null || next.video.firstDts === null ? null : next.video.firstDts - previous.video.dtsEnd;
  const audioPtsDelta = previous.audio.ptsEnd === null || next.audio.firstPts === null ? null : next.audio.firstPts - previous.audio.ptsEnd;
  const audioDtsDelta = previous.audio.dtsEnd === null || next.audio.firstDts === null ? null : next.audio.firstDts - previous.audio.dtsEnd;
  const previousEndSkew = avSkew(
    previous.video.ptsEnd,
    previous.audio.ptsEnd,
  );
  const nextStartSkew = avSkew(next.video.firstPts, next.audio.firstPts);
  return { mediaTime: next.declaredStart, previousIndex: previous.index, nextIndex: next.index,
    videoPtsDelta, videoDtsDelta, audioPtsDelta, audioDtsDelta,
    videoClassification: classifyTimestampDelta(videoPtsDelta), audioClassification: classifyTimestampDelta(audioPtsDelta),
    previousEndSkew, nextStartSkew,
    avSkewJump: previousEndSkew === null || nextStartSkew === null ? null : nextStartSkew - previousEndSkew,
    nextStartsWithVideoKeyframe: next.video.startsWithKeyframe };
});

const classifications = boundaries.reduce<Record<string, number>>((counts, boundary) => {
  const key = `${boundary.videoClassification}/${boundary.audioClassification}`;
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

const targetIndexes = new Set([17, 18, 19, 20]);
console.log(JSON.stringify({
  session: sessionId.slice(0, 8), segmentCount: analyzed.length, classifications,
  streams: {
    video: analyzed[0]?.videoStream && { codec: analyzed[0].videoStream.codec_name, timeBase: analyzed[0].videoStream.time_base,
      frameRate: analyzed[0].videoStream.avg_frame_rate },
    audio: analyzed[0]?.audioStream && { codec: analyzed[0].audioStream.codec_name, timeBase: analyzed[0].audioStream.time_base },
  },
  durationStats: analyzed.reduce((stats, segment) => {
    stats.videoErrors.push(segment.videoDurationError);
    stats.audioErrors.push(segment.audioDurationError);
    return stats;
  }, { videoErrors: [] as Array<number | null>, audioErrors: [] as Array<number | null> }),
  targetSegments: analyzed.filter((segment) => targetIndexes.has(segment.index)).map((segment) => ({
    index: segment.index,
    declaredStart: segment.declaredStart,
    declaredDuration: segment.declaredDuration,
    video: { firstPts: segment.video.firstPts, ptsEnd: segment.video.ptsEnd, firstDts: segment.video.firstDts, dtsEnd: segment.video.dtsEnd,
      actualDuration: segment.video.actualDuration, monotonicDts: segment.video.monotonicDts, duplicateDts: segment.video.duplicateDts,
      startsWithKeyframe: segment.video.startsWithKeyframe },
    audio: { firstPts: segment.audio.firstPts, ptsEnd: segment.audio.ptsEnd, firstDts: segment.audio.firstDts, dtsEnd: segment.audio.dtsEnd,
      actualDuration: segment.audio.actualDuration, monotonicDts: segment.audio.monotonicDts, duplicateDts: segment.audio.duplicateDts },
    videoDurationError: segment.videoDurationError,
    audioDurationError: segment.audioDurationError,
  })),
  boundaries,
  targetPacketDetails: analyzed.filter((segment) => targetIndexes.has(segment.index)).map((segment) => ({
    index: segment.index,
    video: { firstPackets: segment.video.firstPackets, lastPackets: segment.video.lastPackets, keyframes: segment.video.keyframes },
    audio: { firstPackets: segment.audio.firstPackets, lastPackets: segment.audio.lastPackets },
  })),
  remux,
}, null, 2));
