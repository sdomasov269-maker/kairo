"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaybackSource } from "@/server/playback/playback-source";
import { KairoPlaybackEngine } from "@/components/player/engine/KairoPlaybackEngine";
import { loadShakaRuntime } from "@/components/player/engine/shaka-runtime";
import type { KairoPlaybackSnapshot } from "@/components/player/engine/types";
import { getPlaybackOverlay } from "./playback-surface-state";
import styles from "./PlaybackSurface.module.css";

export function PlaybackSurface({ source, poster, title }: { source: PlaybackSource | null; poster?: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<KairoPlaybackEngine | null>(null);
  const sourceRef = useRef(source);
  const [snapshot, setSnapshot] = useState<KairoPlaybackSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    let ownedEngine: KairoPlaybackEngine | null = null;
    const unsubscribers: Array<() => void> = [];
    const initialize = async () => {
      const video = videoRef.current;
      if (!video) return;
      const runtime = await loadShakaRuntime();
      if (!active) return;
      const engine = new KairoPlaybackEngine(runtime);
      ownedEngine = engine;
      engineRef.current = engine;
      const update = (next: KairoPlaybackSnapshot) => { if (active) setSnapshot(next); };
      unsubscribers.push(engine.subscribe("statechange", update));
      unsubscribers.push(engine.subscribe("trackschange", update));
      unsubscribers.push(engine.subscribe("bufferingchange", update));
      unsubscribers.push(engine.subscribe("timeupdate", update));
      await engine.attach(video);
      if (!active) return;
      const currentSource = sourceRef.current;
      if (currentSource && engine.snapshot().state.status !== "error")
        await engine.load({ url: currentSource.url, type: "hls" });
    };
    void initialize();
    return () => {
      active = false;
      for (const unsubscribe of unsubscribers) unsubscribe();
      if (engineRef.current === ownedEngine) engineRef.current = null;
      if (ownedEngine) void ownedEngine.destroy();
    };
  }, []);

  useEffect(() => {
    sourceRef.current = source;
    const engine = engineRef.current;
    if (engine && source) void engine.load({ url: source.url, type: "hls" });
  }, [source]);

  const status = snapshot?.state.status ?? (source ? "loading" : "idle");
  const overlay = source ? getPlaybackOverlay(status) : null;
  return (
    <div className={styles.surface} data-playback-status={status} data-quality-count={snapshot?.tracks.qualities.length ?? 0}>
      {source ? (
        <>
          <video ref={videoRef} aria-label={`Видео: ${title}`} className={styles.video} controls playsInline poster={poster} preload="metadata" />
          {overlay === "loading" ? <p className={styles.message} data-playback-overlay="loading">Загрузка видео…</p> : null}
          {overlay === "buffering" ? <p className={styles.message} data-playback-overlay="buffering">Буферизация…</p> : null}
          {overlay === "error" ? <p className={styles.message} data-playback-overlay="error">Видео временно недоступно.</p> : null}
        </>
      ) : <p className={styles.unavailable}>Видео временно недоступно.</p>}
    </div>
  );
}
