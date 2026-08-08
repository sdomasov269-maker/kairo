"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Maximize, Minimize, Pause, PictureInPicture, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { KodikPlayer } from "./KodikPlayer";
import type { KodikPlayerHandle, KodikPlayerProps } from "./kodik-player.types";
import { DEFAULT_KODIK_CONTROL_MODE, formatKodikTime, isEditablePlayerTarget, KODIK_SPEEDS, kodikShortcut, rendersKairoControlBar, shouldHideKodikControls, type KodikControlMode } from "./kodik-shell.utils";
import styles from "./KodikPlayerShell.module.css";

type KodikPlayerShellProps = KodikPlayerProps & { controlMode?: KodikControlMode };
export const KodikPlayerShell = forwardRef<KodikPlayerHandle, KodikPlayerShellProps>(function KodikPlayerShell({ className, controlMode = DEFAULT_KODIK_CONTROL_MODE, ...props }, ref) {
  const showKairoControls = rendersKairoControlBar(controlMode);
  const shellRef = useRef<HTMLDivElement>(null); const playerRef = useRef<KodikPlayerHandle>(null); const hideTimerRef = useRef<number | null>(null); const lastVolumeRef = useRef(1);
  const [playing, setPlaying] = useState(false); const [currentTime, setCurrentTime] = useState(0); const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1); const [muted, setMuted] = useState(false); const [speed, setSpeedState] = useState(1); const [pip, setPip] = useState(false);
  const [fullscreen, setFullscreen] = useState(false); const [ready, setReady] = useState(false); const [controlsVisible, setControlsVisible] = useState(true); const [menu, setMenu] = useState(false); const [seeking, setSeeking] = useState(false); const [previewTime, setPreviewTime] = useState<number | null>(null);
  useImperativeHandle(ref, () => playerRef.current!, []);
  const clearHide = useCallback(() => { if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }, []);
  const reveal = useCallback(() => { clearHide(); setControlsVisible(true); if (shouldHideKodikControls(playing, menu, seeking)) hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3200); }, [clearHide, menu, playing, seeking]);
  useEffect(() => { if (!showKairoControls) return; reveal(); return clearHide; }, [clearHide, reveal, showKairoControls]);
  useEffect(() => { if (!showKairoControls) return; const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current); document.addEventListener("fullscreenchange", onChange); return () => document.removeEventListener("fullscreenchange", onChange); }, [showKairoControls]);
  const toggleFullscreen = useCallback(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await shellRef.current?.requestFullscreen(); }, []);
  const togglePlay = useCallback(() => { if (playing) playerRef.current?.pause(); else playerRef.current?.play(); }, [playing]);
  useEffect(() => { if (!showKairoControls) return; const onKey = (event: KeyboardEvent) => { if (!shellRef.current?.contains(document.activeElement) || isEditablePlayerTarget(event.target)) return; const action = kodikShortcut(event.key); if (!action) return; event.preventDefault(); if (action === "TOGGLE_PLAY") togglePlay(); if (action === "BACK") playerRef.current?.seek(Math.max(0, currentTime - 10)); if (action === "FORWARD") playerRef.current?.seek(Math.min(duration || Infinity, currentTime + 10)); if (action === "TOGGLE_MUTE") { if (muted) playerRef.current?.unmute(); else playerRef.current?.mute(); } if (action === "TOGGLE_FULLSCREEN") void toggleFullscreen(); reveal(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [currentTime, duration, muted, reveal, showKairoControls, toggleFullscreen, togglePlay]);
  const seekValue = previewTime ?? currentTime;
  return <div ref={shellRef} className={`${styles.shell} ${showKairoControls ? "" : styles.native}`} tabIndex={showKairoControls ? 0 : undefined} onMouseMove={showKairoControls ? reveal : undefined} onPointerDown={showKairoControls ? reveal : undefined} onFocusCapture={showKairoControls ? reveal : undefined}>
    <KodikPlayer ref={playerRef} {...props} className={`${styles.frame} ${className ?? ""}`} onPlay={() => { if (showKairoControls) { setPlaying(true); setReady(true); } props.onPlay?.(); }} onPause={() => { if (showKairoControls) setPlaying(false); props.onPause?.(); }} onSeek={(time) => { if (showKairoControls) setCurrentTime(time); props.onSeek?.(time); }} onTimeUpdate={(time) => { if (showKairoControls) { setCurrentTime(time); setReady(true); } props.onTimeUpdate?.(time); }} onDurationUpdate={(value) => { if (showKairoControls) { setDuration(value); setReady(true); } props.onDurationUpdate?.(value); }} onVideoStarted={() => { if (showKairoControls) { setPlaying(true); setReady(true); } props.onVideoStarted?.(); }} onEnded={() => { if (showKairoControls) setPlaying(false); props.onEnded?.(); }} onVolumeChange={(value) => { if (showKairoControls) { setMuted(value.muted); setVolumeState(value.volume); if (value.volume > 0) lastVolumeRef.current = value.volume; } props.onVolumeChange?.(value); }} onSpeedChange={(value) => { if (showKairoControls) setSpeedState(value); props.onSpeedChange?.(value); }} onEnterPip={() => { if (showKairoControls) setPip(true); props.onEnterPip?.(); }} onExitPip={() => { if (showKairoControls) setPip(false); props.onExitPip?.(); }} />
    {showKairoControls && <><div className={styles.loading} data-ready={ready}><i className={styles.spinner} /><span>Подготовка плеера…</span></div>
    <div className={`${styles.controls} ${!controlsVisible ? styles.hidden : ""}`}>
      <input className={styles.timeline} type="range" min={0} max={duration || 0} step={0.1} value={Math.min(seekValue, duration || 0)} aria-label="Позиция воспроизведения" aria-valuetext={`${formatKodikTime(seekValue)} / ${formatKodikTime(duration)}`} onPointerDown={() => setSeeking(true)} onChange={(event) => setPreviewTime(Number(event.target.value))} onPointerUp={(event) => { playerRef.current?.seek(Number(event.currentTarget.value)); setPreviewTime(null); setSeeking(false); }} onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) { playerRef.current?.seek(Number(event.currentTarget.value)); setPreviewTime(null); } }} onBlur={(event) => { if (previewTime !== null) playerRef.current?.seek(Number(event.currentTarget.value)); setPreviewTime(null); setSeeking(false); }} />
      <div className={styles.row}>
        <button className={styles.button} onClick={togglePlay} aria-label={playing ? "Пауза" : "Воспроизвести"}>{playing ? <Pause /> : <Play fill="currentColor" />}</button>
        <span className={styles.time}>{formatKodikTime(seekValue)} / {formatKodikTime(duration)}</span>
        <button className={styles.button} onClick={() => muted || volume === 0 ? (playerRef.current?.setVolume(lastVolumeRef.current), playerRef.current?.unmute()) : playerRef.current?.mute()} aria-label={muted || volume === 0 ? "Включить звук" : "Выключить звук"}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</button>
        <input className={styles.volume} type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label="Громкость" onChange={(event) => { const value = Number(event.target.value); playerRef.current?.setVolume(value); if (muted) playerRef.current?.unmute(); }} />
        <span className={styles.spacer} />
        <div className={styles.menuWrap}><button className={`${styles.button} ${styles.speed}`} onClick={() => setMenu((value) => !value)} aria-label="Скорость воспроизведения" aria-expanded={menu}>{speed}×</button>{menu && <div className={styles.menu}>{KODIK_SPEEDS.map((value) => <button key={value} className={speed === value ? styles.active : ""} onClick={() => { playerRef.current?.setSpeed(value); setMenu(false); }}>{value}×</button>)}</div>}</div>
        <button className={styles.button} onClick={() => setMenu((value) => !value)} aria-label="Настройки"><Settings /></button>
        <button className={styles.button} onClick={() => pip ? playerRef.current?.exitPip() : playerRef.current?.enterPip()} aria-label={pip ? "Выйти из режима картинка в картинке" : "Картинка в картинке"}><PictureInPicture /></button>
        <button className={styles.button} onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}>{fullscreen ? <Minimize /> : <Maximize />}</button>
      </div>
    </div></>}
  </div>;
});
