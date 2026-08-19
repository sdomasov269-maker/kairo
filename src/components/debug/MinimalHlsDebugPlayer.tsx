"use client";

import Hls from "hls.js";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./MinimalHlsDebugPlayer.module.css";

type Metrics = {
  currentTime: number;
  duration: number;
  paused: boolean;
  readyState: number;
  networkState: number;
  bufferAhead: number;
  bufferedRanges: string;
};

const INITIAL_METRICS: Metrics = {
  currentTime: 0, duration: 0, paused: true, readyState: 0, networkState: 0,
  bufferAhead: 0, bufferedRanges: "—",
};

const MEDIA_ERROR_NAMES: Record<number, string> = {
  1: "MEDIA_ERR_ABORTED",
  2: "MEDIA_ERR_NETWORK",
  3: "MEDIA_ERR_DECODE",
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
};

function inspect(video: HTMLVideoElement): Metrics {
  const ranges: string[] = [];
  let bufferAhead = 0;
  for (let index = 0; index < video.buffered.length; index += 1) {
    const start = video.buffered.start(index);
    const end = video.buffered.end(index);
    ranges.push(`${start.toFixed(2)}–${end.toFixed(2)}`);
    if (video.currentTime >= start && video.currentTime <= end)
      bufferAhead = Math.max(0, end - video.currentTime);
  }
  return {
    currentTime: video.currentTime, duration: video.duration, paused: video.paused,
    readyState: video.readyState, networkState: video.networkState, bufferAhead,
    bufferedRanges: ranges.join(", ") || "—",
  };
}

export function MinimalHlsDebugPlayer({ initialSource }: { initialSource: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [input, setInput] = useState(initialSource);
  const [source, setSource] = useState(initialSource);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);
  const [events, setEvents] = useState<string[]>([]);

  const log = useCallback((event: string, extra = "") => {
    const video = videoRef.current;
    const snapshot = video ? inspect(video) : INITIAL_METRICS;
    setMetrics(snapshot);
    const stamp = new Date().toLocaleTimeString();
    setEvents((current) => [...current, `${stamp} ${event} time=${snapshot.currentTime.toFixed(2)} bufferAhead=${snapshot.bufferAhead.toFixed(2)} ${extra}`.trim()].slice(-200));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      log("ENGINE_SELECTED", "hls.js");
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => log("MEDIA_ATTACHED"));
      hls.on(Hls.Events.MANIFEST_PARSED, () => log("MANIFEST_PARSED"));
      hls.on(Hls.Events.FRAG_LOADING, (_, data) => log("FRAG_LOADING", `sn=${data.frag.sn}`));
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => log("FRAG_LOADED", `sn=${data.frag.sn}`));
      hls.on(Hls.Events.FRAG_BUFFERED, (_, data) => log("FRAG_BUFFERED", `sn=${data.frag.sn}`));
      hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, (_, data) => log("FRAG_LOAD_EMERGENCY_ABORTED", `sn=${data.frag?.sn ?? "—"}`));
      hls.on(Hls.Events.ERROR, (_, data) => log("HLS_ERROR", `type=${data.type} details=${data.details} fatal=${data.fatal} status=${data.response?.code ?? "—"} sn=${data.frag?.sn ?? "—"} start=${data.frag?.start ?? "—"} duration=${data.frag?.duration ?? "—"}`));
      return () => hls.destroy();
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      log("ENGINE_SELECTED", "native-hls");
      return () => { video.removeAttribute("src"); video.load(); };
    }
    log("HLS_UNSUPPORTED");
    return;
  }, [log, source]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setEvents([]);
    setSource(input.trim());
  };

  return <main className={styles.page}>
    <h1>Minimal HLS baseline</h1>
    <p className={styles.note}>Default hls.js + native video controls. No Kairo recovery, progress, reload, or fallback.</p>
    <form className={styles.form} onSubmit={submit}>
      <input aria-label="HLS URL" onChange={(event) => setInput(event.target.value)} placeholder="https://…/manifest.m3u8" type="url" value={input} />
      <button type="submit">Load</button>
    </form>
    <section className={styles.grid}>
      <video className={styles.video} controls onCanPlay={() => log("canplay")} onError={(event) => { const error = event.currentTarget.error; log("VIDEO_ERROR", `code=${error?.code ?? "—"} name=${error ? MEDIA_ERROR_NAMES[error.code] ?? "UNKNOWN" : "—"} message=${error?.message ?? "—"}`); }} onPause={() => log("pause")} onPlaying={() => log("playing")} onSeeking={() => log("seeking")} onSeeked={() => log("seeked")} onStalled={() => log("stalled")} onTimeUpdate={() => setMetrics(videoRef.current ? inspect(videoRef.current) : INITIAL_METRICS)} onWaiting={() => log("waiting")} ref={videoRef} />
      <aside className={styles.panel}><dl className={styles.metrics}>{Object.entries(metrics).map(([key, value]) => <><dt key={`${key}-key`}>{key}</dt><dd key={`${key}-value`}>{typeof value === "number" ? value.toFixed(2) : value}</dd></>)}</dl></aside>
      <div className={styles.log} aria-live="polite">{events.length ? events.map((event, index) => <p key={`${event}-${index}`}>{event}</p>) : <p>Event log is empty.</p>}</div>
    </section>
  </main>;
}
