import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

type Packet = { stream_index: number; pts_time?: string; dts_time?: string; duration_time?: string; flags?: string };
type Stream = { index: number; codec_type?: string };
type Probe = { packets?: Packet[]; streams?: Stream[] };
type Segment = { sourceIndex: number; declared: number; token: string; cacheFile: string; localFile: string };

const sessionId = process.argv[2];
if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("Usage: prepare-normalization-feasibility.ts <session-id>");
const root = join(tmpdir(), "kairo-normalization-test");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const cacheRoot = join(tmpdir(), "kairo", "playback-cache", hash(`session\0${sessionId}`));
const base = `http://localhost:3000/api/stream/${sessionId}`;
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

const manifestResponse = await fetch(`${base}/master.m3u8`);
if (!manifestResponse.ok) throw new Error(`Manifest failed: ${manifestResponse.status}`);
const lines = (await manifestResponse.text()).split(/\r?\n/);
const resources: Array<{ duration: number; token: string }> = [];
let pendingDuration = 0;
for (const line of lines) {
  const extinf = /^#EXTINF:([0-9.]+)/.exec(line);
  if (extinf) pendingDuration = Number(extinf[1]);
  const resource = /\/resource\/([0-9a-f]+)$/.exec(line);
  if (resource) resources.push({ duration: pendingDuration, token: resource[1]! });
}

const corpusStart = 15;
const corpusEnd = 21;
const corpusDir = join(root, "corpus");
mkdirSync(corpusDir);
const segments: Segment[] = [];
for (let sourceIndex = corpusStart; sourceIndex <= corpusEnd; sourceIndex += 1) {
  const resource = resources[sourceIndex];
  if (!resource) throw new Error(`Missing source segment ${sourceIndex}`);
  const cacheFile = join(cacheRoot, `${hash(`resource\0${resource.token}`)}.bin`);
  if (!existsSync(cacheFile)) {
    const response = await fetch(`${base}/resource/${resource.token}`);
    if (!response.ok) throw new Error(`Segment ${sourceIndex} failed: ${response.status}`);
    await response.arrayBuffer();
  }
  const localFile = join(corpusDir, `segment-${sourceIndex}.ts`);
  copyFileSync(cacheFile, localFile);
  segments.push({ sourceIndex, declared: resource.duration, token: resource.token.slice(0, 8), cacheFile, localFile });
}

function probe(file: string): Probe {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_packets", "-of", "json", file],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe exited ${result.status}`);
  return JSON.parse(result.stdout) as Probe;
}

function coverage(packets: Packet[]) {
  const starts = packets.map((packet) => Number(packet.pts_time)).filter(Number.isFinite);
  const ends = packets.map((packet) => Number(packet.pts_time) + Number(packet.duration_time)).filter(Number.isFinite);
  return starts.length && ends.length ? Math.max(...ends) - Math.min(...starts) : null;
}

const analyzed = segments.map((segment) => {
  const data = probe(segment.localFile);
  const videoIndex = data.streams?.find((stream) => stream.codec_type === "video")?.index;
  const audioIndex = data.streams?.find((stream) => stream.codec_type === "audio")?.index;
  const videoPackets = (data.packets ?? []).filter((packet) => packet.stream_index === videoIndex);
  const audioPackets = (data.packets ?? []).filter((packet) => packet.stream_index === audioIndex);
  return { ...segment, videoCoverage: coverage(videoPackets), audioCoverage: coverage(audioPackets) };
});

function writePlaylist(name: string, durationFor: (segment: typeof analyzed[number]) => number) {
  const dir = join(root, name);
  mkdirSync(dir);
  for (const segment of analyzed) copyFileSync(segment.localFile, join(dir, `segment-${segment.sourceIndex}.ts`));
  const durations = analyzed.map(durationFor);
  const playlist = ["#EXTM3U", "#EXT-X-VERSION:3", `#EXT-X-TARGETDURATION:${Math.ceil(Math.max(...durations))}`,
    `#EXT-X-MEDIA-SEQUENCE:${corpusStart}`,
    ...analyzed.flatMap((segment, index) => [`#EXTINF:${durations[index]!.toFixed(6)},`, `segment-${segment.sourceIndex}.ts`]),
    "#EXT-X-ENDLIST", ""].join("\n");
  writeFileSync(join(dir, "playlist.m3u8"), playlist);
  return durations;
}

const originalDurations = writePlaylist("original", (segment) => segment.declared);
const videoDurations = writePlaylist("manifest-video", (segment) => segment.sourceIndex === 20 ? segment.videoCoverage ?? segment.declared : segment.declared);
const maxAvDurations = writePlaylist("manifest-max-av", (segment) => segment.sourceIndex === 20
  ? Math.max(segment.videoCoverage ?? 0, segment.audioCoverage ?? 0) : segment.declared);

function runFfmpeg(label: string, args: string[]) {
  const started = performance.now();
  const result = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const wallSeconds = (performance.now() - started) / 1000;
  if (result.status !== 0) throw new Error(`${label}: ${result.stderr}`);
  return { wallSeconds, logTail: result.stderr.trim().split(/\r?\n/).slice(-8) };
}

const concatInput = `concat:${analyzed.map((segment) => segment.localFile.replaceAll("\\", "/")).join("|")}`;
const copyDir = join(root, "keyframe-copy");
mkdirSync(copyDir);
const copyCost = runFfmpeg("keyframe-copy", ["-i", concatInput, "-map", "0:v:0", "-map", "0:a:0", "-c", "copy", "-f", "hls",
  "-hls_time", "6", "-hls_list_size", "0", "-hls_flags", "independent_segments", "-hls_segment_filename", join(copyDir, "segment-%03d.ts"), join(copyDir, "playlist.m3u8")]);

const encodeDir = join(root, "normalized-encode");
mkdirSync(encodeDir);
const encodeCost = runFfmpeg("normalized-encode", ["-i", concatInput, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
  "-r", "24000/1001", "-fps_mode", "cfr", "-g", "144", "-keyint_min", "144", "-sc_threshold", "0", "-force_key_frames", "expr:gte(t,n_forced*6)",
  "-c:a", "copy", "-f", "hls", "-hls_time", "6", "-hls_list_size", "0", "-hls_flags", "independent_segments",
  "-hls_segment_filename", join(encodeDir, "segment-%03d.ts"), join(encodeDir, "playlist.m3u8")]);

function analyzeVariant(name: string) {
  const dir = join(root, name);
  const playlist = readFileSync(join(dir, "playlist.m3u8"), "utf8").split(/\r?\n/);
  const files = playlist.filter((line) => line && !line.startsWith("#"));
  const declared = playlist.map((line) => /^#EXTINF:([0-9.]+)/.exec(line)?.[1]).filter(Boolean).map(Number);
  const packetSets = files.map((file) => {
    const data = probe(join(dir, file));
    const videoIndex = data.streams?.find((stream) => stream.codec_type === "video")?.index;
    const audioIndex = data.streams?.find((stream) => stream.codec_type === "audio")?.index;
    return {
      video: (data.packets ?? []).filter((packet) => packet.stream_index === videoIndex),
      audio: (data.packets ?? []).filter((packet) => packet.stream_index === audioIndex),
      bytes: statSync(join(dir, file)).size,
    };
  });
  const videoPts = packetSets.flatMap((set) => set.video.map((packet) => Number(packet.pts_time)).filter(Number.isFinite)).sort((a, b) => a - b);
  const audioPts = packetSets.flatMap((set) => set.audio.map((packet) => Number(packet.pts_time)).filter(Number.isFinite)).sort((a, b) => a - b);
  const intervals = videoPts.slice(1).map((pts, index) => pts - videoPts[index]!).sort((a, b) => b - a);
  const timelineStart = Math.min(videoPts[0] ?? Infinity, audioPts[0] ?? Infinity);
  const nearest = (values: number[], target: number) => values.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best, values[0]!);
  const videoEnds = packetSets.flatMap((set) => set.video.map((packet) => Number(packet.pts_time) + Number(packet.duration_time)).filter(Number.isFinite));
  const audioEnds = packetSets.flatMap((set) => set.audio.map((packet) => Number(packet.pts_time) + Number(packet.duration_time)).filter(Number.isFinite));
  return {
    declared,
    segmentCount: files.length,
    allSegmentsStartWithKeyframe: packetSets.every((set) => set.video[0]?.flags?.includes("K")),
    startsWithKeyframe: packetSets.map((set) => Boolean(set.video[0]?.flags?.includes("K"))),
    videoPacketCount: packetSets.reduce((sum, set) => sum + set.video.length, 0),
    audioPacketCount: packetSets.reduce((sum, set) => sum + set.audio.length, 0),
    maxPresentationIntervals: intervals.slice(0, 5),
    outputBytes: packetSets.reduce((sum, set) => sum + set.bytes, 0),
    videoCoverage: coverage(packetSets.flatMap((set) => set.video)),
    audioCoverage: coverage(packetSets.flatMap((set) => set.audio)),
    avSkew: {
      start: (videoPts[0] ?? 0) - (audioPts[0] ?? 0),
      at18: nearest(videoPts, timelineStart + 18) - nearest(audioPts, timelineStart + 18),
      at30: nearest(videoPts, timelineStart + 30) - nearest(audioPts, timelineStart + 30),
      end: Math.max(...videoEnds) - Math.max(...audioEnds),
    },
  };
}

const variantAnalysis = Object.fromEntries(["original", "manifest-video", "manifest-max-av", "keyframe-copy", "normalized-encode"]
  .map((name) => [name, analyzeVariant(name)]));

const metadata = {
  source: { session: sessionId.slice(0, 8), sourceIndexes: [corpusStart, corpusEnd], intendedWindowSeconds: [90, 132] },
  analyzed: analyzed.map((segment) => ({ sourceIndex: segment.sourceIndex, declared: segment.declared, token: segment.token,
    videoCoverage: segment.videoCoverage, audioCoverage: segment.audioCoverage })),
  manifestVariants: { originalDurations, videoDurations, maxAvDurations },
  costs: { keyframeCopy: copyCost, normalizedEncode: encodeCost },
  inputBytes: analyzed.reduce((sum, segment) => sum + statSync(segment.localFile).size, 0),
  variantAnalysis,
};
writeFileSync(join(root, "metadata.json"), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify({ root, ...metadata }, null, 2));
