"use client";

import { useEffect, useRef, useState } from "react";
import { KairoPlayer, type SourceMode } from "@/components/player/KairoPlayer";
import {
  animegoSearchResultSchema,
  animegoVoicesSchema,
} from "@/lib/playback/animego-cvh";
import {
  playbackDescriptorSchema,
  playbackTitleInfoSchema,
  type PlaybackDescriptor,
} from "@/lib/playback/descriptor";
import styles from "../kodik-player/page.module.css";

type Provider = "auto" | "kodik" | "animego-cvh";
type Option = { id: string; name: string };

async function request(path: string, signal: AbortSignal) {
  const response = await fetch(path, { cache: "no-store", signal });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      value && typeof value === "object" && "error" in value
        ? (value.error as { message?: unknown }).message
        : null;
    throw new Error(
      typeof message === "string" ? message : "Provider request failed",
    );
  }
  return value;
}

export function ProviderDebug() {
  const [provider, setProvider] = useState<Provider>("auto");
  const [simulateKodikFailure, setSimulateKodikFailure] = useState("");
  const [simulateCvhFailure, setSimulateCvhFailure] = useState("");
  const [shikimoriId, setShikimoriId] = useState("56735");
  const [title, setTitle] = useState(
    "Аккуратная и симпатичная девочка в моей новой школе",
  );
  const [year, setYear] = useState("2026");
  const [animeId, setAnimeId] = useState("3591");
  const [episode, setEpisode] = useState("1");
  const [options, setOptions] = useState<Option[]>([]);
  const [translationId, setTranslationId] = useState("");
  const [descriptor, setDescriptor] = useState<PlaybackDescriptor | null>(null);
  const [mode, setMode] = useState<SourceMode>("auto");
  const [status, setStatus] = useState(
    "Choose a provider and load translations/voices.",
  );
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const run = async (kind: "options" | "playback") => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setStatus(kind === "options" ? "Loading options…" : "Resolving playback…");
    try {
      if (provider === "kodik" || provider === "auto") {
        const query = new URLSearchParams({ shikimoriId, episode });
        if (kind === "playback" && translationId)
          query.set("translationId", translationId);
        if (kind === "playback" && provider === "auto") {
          query.append("title", title);
          query.set("year", year);
          query.set("mediaType", "tv");
          const selectedName = options.find(
            (item) => item.id === translationId,
          )?.name;
          if (selectedName) query.set("translationName", selectedName);
          if (simulateKodikFailure)
            query.set("simulateKodikFailure", simulateKodikFailure);
          if (simulateCvhFailure)
            query.set("simulateCvhFailure", simulateCvhFailure);
        }
        const value = await request(
          kind === "options"
            ? `/api/playback/kodik/translations?${query}`
            : provider === "auto"
              ? `/api/playback/resolve?${query}`
              : `/api/playback/kodik?${query}`,
          controller.signal,
        );
        if (generation !== generationRef.current) return;
        if (kind === "options") {
          const info = playbackTitleInfoSchema.parse(value);
          const next = info.translations.map((item) => ({
            id: item.id,
            name: item.name,
          }));
          setOptions(next);
          setTranslationId(next[0]?.id ?? "");
          setStatus(`${next.length} Kodik translations`);
        } else {
          const parsed = playbackDescriptorSchema.parse(value);
          setDescriptor(parsed);
          setStatus(
            provider === "auto"
              ? `AUTO descriptor ready · ${parsed.provider} · fallback=${parsed.fallbackUsed ? "yes" : "no"}`
              : "Kodik descriptor ready",
          );
        }
        return;
      }
      if (kind === "options") {
        const resolveQuery = new URLSearchParams({
          title,
          year,
          mediaType: "tv",
        });
        const resolved = animegoSearchResultSchema.parse(
          await request(
            `/api/playback/animego/resolve?${resolveQuery}`,
            controller.signal,
          ),
        );
        if (generation !== generationRef.current) return;
        setAnimeId(resolved.id);
        const voicesQuery = new URLSearchParams({
          animeId: resolved.id,
          episode,
        });
        const voices = animegoVoicesSchema.parse(
          await request(
            `/api/playback/animego/voices?${voicesQuery}`,
            controller.signal,
          ),
        );
        if (generation !== generationRef.current) return;
        const next = voices.voices.map((voice) => ({
          id: voice.translationId,
          name: voice.name,
        }));
        setOptions(next);
        setTranslationId(next[0]?.id ?? "");
        setStatus(`AnimeGO ${resolved.id} · ${next.length} CVH voices`);
      } else {
        const query = new URLSearchParams({ animeId, episode });
        if (translationId) query.set("translationId", translationId);
        const value = await request(
          `/api/playback/animego?${query}`,
          controller.signal,
        );
        if (generation !== generationRef.current) return;
        setDescriptor(playbackDescriptorSchema.parse(value));
        setStatus("AnimeGO/CVH descriptor ready");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (generation === generationRef.current)
        setStatus(
          error instanceof Error ? error.message : "Provider request failed",
        );
    }
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <main className={styles.main}>
      <header>
        <p>Kairo / Development</p>
        <h1>Playback providers</h1>
      </header>
      <section className={styles.resolver} aria-label="Provider resolver">
        <label>
          Provider
          <select
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as Provider);
              setOptions([]);
              setDescriptor(null);
            }}
          >
            <option value="auto">AUTO</option>
            <option value="kodik">KODIK</option>
            <option value="animego-cvh">AnimeGO / CVH</option>
          </select>
        </label>
        {provider === "kodik" || provider === "auto" ? (
          <label>
            Shikimori ID
            <input
              value={shikimoriId}
              onChange={(event) => setShikimoriId(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Year
              <input
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
            <label>
              AnimeGO ID
              <input
                value={animeId}
                onChange={(event) => setAnimeId(event.target.value)}
              />
            </label>
          </>
        )}
        {provider === "auto" ? (
          <>
            <label>
              Simulate Kodik failure
              <select
                value={simulateKodikFailure}
                onChange={(event) =>
                  setSimulateKodikFailure(event.target.value)
                }
              >
                <option value="">None</option>
                <option value="PROVIDER_UNAVAILABLE">
                  PROVIDER_UNAVAILABLE
                </option>
              </select>
            </label>
            <label>
              Simulate CVH failure
              <select
                value={simulateCvhFailure}
                onChange={(event) => setSimulateCvhFailure(event.target.value)}
              >
                <option value="">None</option>
                <option value="PROVIDER_UNAVAILABLE">
                  PROVIDER_UNAVAILABLE
                </option>
              </select>
            </label>
          </>
        ) : null}
        <label>
          Episode
          <input
            value={episode}
            onChange={(event) => setEpisode(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => void run("options")}>
          Load {provider === "animego-cvh" ? "CVH voices" : "translations"}
        </button>
        <label>
          Translation / voice
          <select
            value={translationId}
            onChange={(event) => setTranslationId(event.target.value)}
          >
            <option value="">Auto</option>
            {options.map((option) => (
              <option value={option.id} key={option.id}>
                {option.name}
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
        <button type="button" onClick={() => void run("playback")}>
          Resolve playback
        </button>
        <output className={styles.status}>{status}</output>
      </section>
      <KairoPlayer descriptor={descriptor} mode={mode} />
    </main>
  );
}
