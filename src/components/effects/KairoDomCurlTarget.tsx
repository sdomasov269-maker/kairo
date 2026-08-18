"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  registerDomCurlTarget,
  type CurlTargetKind,
} from "@/components/webgl/dom-curl/DomCurlRegistry";
import styles from "./KairoDomCurlTarget.module.css";

export function KairoDomCurlTarget({
  children,
  className = "",
  kind = "text",
  multiplier,
}: {
  children: ReactNode;
  className?: string;
  kind?: Exclude<CurlTargetKind, "image">;
  multiplier?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return registerDomCurlTarget({ element, key, kind, multiplier });
  }, [key, kind, multiplier]);
  return (
    <div className={`${className} ${styles.target}`} ref={ref}>
      {children}
    </div>
  );
}
