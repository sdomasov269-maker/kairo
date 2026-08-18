"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ColorManagement,
  DoubleSide,
  LinearFilter,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector4,
} from "three";
import {
  setDomTargetReady,
  type DomImageTarget,
} from "../dom-sync/DomTargetRegistry";
import {
  imageFragmentShader,
  imageVertexShader,
  passthroughImageFragmentShader,
} from "./shaders";

export function WebGLImageLayer({
  target,
  getCurlStrength,
}: {
  target: DomImageTarget;
  getCurlStrength: () => number;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { size } = useThree();
  const [texture, setTexture] = useState<Texture | null>(null);
  const debugPassthroughMaterial = useSyncExternalStore(
    () => () => undefined,
    () =>
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("kairoWebglMaterial") ===
        "passthrough",
    () => false,
  );
  const uniforms = useMemo(
    () => ({
      uTexture: { value: null },
      uTextureSize: { value: new Vector2(1, 1) },
      uViewportPx: { value: new Vector2(1, 1) },
      uRect: { value: new Vector4(0, 0, 0, 0) },
      uRadiusPx: { value: 0 },
      uCurlStrength: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    let active = true;
    let loadedTexture: Texture | null = null;
    setDomTargetReady(target, false);
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      target.src,
      (loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = SRGBColorSpace;
        loaded.minFilter = LinearFilter;
        loaded.magFilter = LinearFilter;
        loaded.generateMipmaps = false;
        loaded.needsUpdate = true;
        if (process.env.NODE_ENV === "development") {
          console.debug("[Kairo WebGL texture]", {
            src: target.src,
            colorManagement: ColorManagement.enabled,
            colorSpace: loaded.colorSpace,
            version: loaded.version,
          });
        }
        loadedTexture = loaded;
        setTexture(loaded);
      },
      undefined,
      () => setDomTargetReady(target, false),
    );
    return () => {
      active = false;
      setDomTargetReady(target, false);
      loadedTexture?.dispose();
    };
  }, [target]);

  useFrame(() => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    const rect = target.rect;
    if (
      !mesh ||
      !material ||
      !texture ||
      !rect ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      if (mesh) mesh.visible = false;
      return;
    }

    const nearViewport =
      rect.bottom >= -size.height && rect.top <= size.height * 2;
    mesh.visible = nearViewport;
    if (!nearViewport) return;

    const image = texture.image as { width?: number; height?: number };
    material.uniforms.uTexture.value = texture;
    material.uniforms.uTextureSize.value.set(
      image.width ?? 1,
      image.height ?? 1,
    );
    material.uniforms.uViewportPx.value.set(size.width, size.height);
    material.uniforms.uRect.value.set(
      rect.left / size.width,
      1 - rect.bottom / size.height,
      rect.width / size.width,
      rect.height / size.height,
    );
    material.uniforms.uRadiusPx.value = rect.radius;
    material.uniforms.uCurlStrength.value = getCurlStrength();
    setDomTargetReady(target, true);
  }, -1);

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
        vertexShader={imageVertexShader}
        fragmentShader={
          debugPassthroughMaterial
            ? passthroughImageFragmentShader
            : imageFragmentShader
        }
        uniforms={uniforms}
      />
    </mesh>
  );
}
