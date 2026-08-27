"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KairoPlayer,
  type SourceMode,
  type StallRecord,
} from "@/components/player/KairoPlayer";
import {
  playbackDescriptorSchema,
  playbackTitleInfoSchema,
  type PlaybackDescriptor,
  type PlaybackTranslation,
} from "@/lib/playback/descriptor";
import styles from "./page.module.css";

export function KodikPlayerDebug() {
  const [shikimoriId, setShikimoriId] = useState("53446");
  const [episode, setEpisode] = useState("1");
  const [translations, setTranslations] = useState<PlaybackTranslation[]>([]);
  const [translationId, setTranslationId] = useState("");
  const [mode, setMode] = useState<SourceMode>("auto");
  const [descriptor, setDescriptor] = useState<PlaybackDescriptor | null>(null);
  const [status, setStatus] = useState("Idle");
  const [stalls, setStalls] = useState<StallRecord[]>([]);
  const requestGeneration = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (kind: "translations" | "playback", selectedTranslation?: string) => {
      const generation = ++requestGeneration.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("Resolving…");
      try {
        const query = new URLSearchParams({ shikimoriId });
        if (kind === "playback") {
          query.set("episode", episode);
          if (selectedTranslation || translationId)
            query.set("translationId", selectedTranslation || translationId);
        }
        const response = await fetch(
          `/api/playback/kodik${kind === "translations" ? "/translations" : ""}?${query}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const value: unknown = await response.json();
        if (!response.ok)
          throw new Error(
            typeof value === "object" && value && "error" in value
              ? JSON.stringify(value.error)
              : `HTTP ${response.status}`,
          );
        if (generation !== requestGeneration.current) return;
        if (kind === "translations") {
          const info = playbackTitleInfoSchema.parse(value);
          setTranslations(info.translations);
          const nextTranslation = info.translations[0]?.id ?? "";
          setTranslationId(nextTranslation);
          setStatus(
            `${info.seriesCount} episodes · ${info.translations.length} translations`,
          );
        } else {
          setDescriptor(playbackDescriptorSchema.parse(value));
          setStalls([]);
          setStatus("Descriptor resolved");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (generation === requestGeneration.current)
          setStatus(error instanceof Error ? error.message : "Resolve failed");
      }
    },
    [episode, shikimoriId, translationId],
  );

  useEffect(() => () => abortRef.current?.abort(), []);
  const recordStall = useCallback(
    (stall: StallRecord) =>
      setStalls((current) => [...current.slice(-19), stall]),
    [],
  );

  return (
    <main className={styles.main}>
      <header>
        <p>Kairo / Development</p>
        <h1>Kodik Player baseline</h1>
      </header>
      <section className={styles.resolver} aria-label="Kodik resolver">
        <label>
          Shikimori ID
          <input
            value={shikimoriId}
            inputMode="numeric"
            onChange={(event) => setShikimoriId(event.target.value)}
          />
        </label>
        <label>
          Episode
          <input
            value={episode}
            inputMode="numeric"
            onChange={(event) => setEpisode(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => run("translations")}>
          Load translations
        </button>
        <label>
          Translation
          <select
            value={translationId}
            onChange={(event) => {
              setTranslationId(event.target.value);
              void run("playback", event.target.value);
            }}
          >
            <option value="">Auto</option>
            {translations.map((translation) => (
              <option key={translation.id} value={translation.id}>
                {translation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as SourceMode)}
          >
            <option value="auto">AUTO (HLS)</option>
            <option value="hls">HLS</option>
            <option value="mp4">MP4</option>
          </select>
        </label>
        <button type="button" onClick={() => run("playback")}>
          Resolve playback
        </button>
        <output className={styles.status}>{status}</output>
      </section>
      <KairoPlayer descriptor={descriptor} mode={mode} onStall={recordStall} />
      <section className={styles.stalls}>
        <h2>Stall observations ({stalls.length})</h2>
        {stalls.length ? (
          <ol>
            {stalls.map((stall, index) => (
              <li key={`${stall.currentTime}-${index}`}>
                {stall.observedAt} {stall.event} {stall.protocol} t=
                {stall.currentTime.toFixed(2)} ready=
                {stall.readyState} network={stall.networkState} ahead=
                {stall.bufferAhead.toFixed(2)} hls={stall.hlsError}
              </li>
            ))}
          </ol>
        ) : (
          <p>No waiting/stalled events recorded.</p>
        )}
      </section>
    </main>
  );
}
