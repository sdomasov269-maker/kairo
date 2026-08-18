"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { registerDomImageTarget } from "@/components/webgl/dom-sync/DomTargetRegistry";
import { registerDomCurlTarget } from "@/components/webgl/dom-curl/DomCurlRegistry";
import styles from "./WebGLImageTarget.module.css";

export function WebGLImageTarget({
  children,
  src,
}: {
  children: ReactNode;
  src: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = useId();

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const unregisterSurface = registerDomCurlTarget({
      element,
      key: `${key}-surface`,
      kind: "surface",
    });
    let unregister: (() => void) | undefined;
    const image = new window.Image();
    image.onload = () => {
      unregister = registerDomImageTarget({ key, src, element });
    };
    image.src = src;
    return () => {
      image.onload = null;
      unregister?.();
      unregisterSurface();
    };
  }, [key, src]);

  return (
    <div className={styles.target} ref={ref}>
      {children}
    </div>
  );
}
