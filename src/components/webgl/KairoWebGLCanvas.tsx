"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { DomTargetRectSampler } from "./dom-sync/DomTargetRectSampler";
import {
  getDomImageTargets,
  resetDomTargetReadiness,
  subscribeDomImageTargets,
  type DomImageTarget,
} from "./dom-sync/DomTargetRegistry";
import { WebGLImageLayer } from "./images/WebGLImageLayer";
import { sampleCurlStrength } from "./images/curlStrength";
import { setGlobalCurlStrength } from "./curl/CurlState";
import { DomCurlFrameUpdater } from "./dom-curl/DomCurlFrameUpdater";
import { getScrollSnapshot } from "./scroll/scrollBus";
import styles from "./KairoWebGLCanvas.module.css";
import { KairoWebGLDebugMode } from "./debug/KairoWebGLDebugMode";

const EMPTY_TARGETS: DomImageTarget[] = [];

function WebGLContextGuard() {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onContextLost = () => resetDomTargetReadiness();
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => canvas.removeEventListener("webglcontextlost", onContextLost);
  }, [gl]);
  return null;
}

function KairoWebGLScene() {
  const targets = useSyncExternalStore(
    subscribeDomImageTargets,
    getDomImageTargets,
    () => EMPTY_TARGETS,
  );
  const curlStrength = useRef(0);
  const getCurlStrength = useCallback(() => curlStrength.current, []);

  useFrame((_, delta) => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    curlStrength.current = reducedMotion
      ? 0
      : sampleCurlStrength(getScrollSnapshot().scrollTop, delta);
    setGlobalCurlStrength(curlStrength.current);
  }, -2);

  return (
    <>
      <DomTargetRectSampler />
      <DomCurlFrameUpdater />
      <WebGLContextGuard />
      {targets.map((target) => (
        <WebGLImageLayer
          target={target}
          getCurlStrength={getCurlStrength}
          key={target.key}
        />
      ))}
    </>
  );
}

export function KairoWebGLCanvas({ suspended = false }: { suspended?: boolean }) {
  useEffect(() => {
    if (suspended) resetDomTargetReadiness();
  }, [suspended]);

  return (
    <Canvas
      id="kairo-webgl-canvas"
      className={styles.canvas}
      data-playback-suspended={suspended || undefined}
      dpr={[1, 1.5]}
      flat
      frameloop={suspended ? "never" : "always"}
      gl={{
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = NoToneMapping;
        if (process.env.NODE_ENV === "development") {
          console.debug("[Kairo WebGL color pipeline]", {
            outputColorSpace: gl.outputColorSpace,
            toneMapping: gl.toneMapping,
            premultipliedAlpha: gl.getContext().getContextAttributes()
              ?.premultipliedAlpha,
          });
        }
      }}
      orthographic
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      fallback={null}
    >
      {!suspended && <KairoWebGLDebugMode />}
      {!suspended && <KairoWebGLScene />}
    </Canvas>
  );
}
