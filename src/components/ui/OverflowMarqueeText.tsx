"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

interface OverflowMarqueeTextProps {
  text: string;
  className?: string;
}

const OVERFLOW_THRESHOLD = 2;
const PIXELS_PER_SECOND = 30;

export function OverflowMarqueeText({
  text,
  className = "",
}: OverflowMarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const [active, setActive] = useState(false);
  const reducedMotion = useReducedMotion();

  const measure = useCallback(() => {
    const container = containerRef.current;
    const textElement = textRef.current;
    if (!container || !textElement) return;
    const distance = Math.ceil(textElement.scrollWidth - container.clientWidth);
    setOverflowDistance(distance > OVERFLOW_THRESHOLD ? distance : 0);
  }, []);

  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (textRef.current) observer.observe(textRef.current);

    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure, text]);

  useEffect(() => {
    const interactiveParent =
      containerRef.current?.closest("a, button") ??
      containerRef.current?.closest("article");
    if (!interactiveParent) return;
    const activate = () => setActive(true);
    const deactivate = () => setActive(false);
    interactiveParent.addEventListener("focusin", activate);
    interactiveParent.addEventListener("focusout", deactivate);
    return () => {
      interactiveParent.removeEventListener("focusin", activate);
      interactiveParent.removeEventListener("focusout", deactivate);
    };
  }, []);

  const canAnimate = overflowDistance > 0 && !reducedMotion;
  const duration = Math.min(
    8,
    Math.max(2, overflowDistance / PIXELS_PER_SECOND),
  );
  const style = {
    "--marquee-distance": `${overflowDistance}px`,
  } as CSSProperties;

  return (
    <span
      ref={containerRef}
      className={`overflow-marquee ${overflowDistance > 0 ? "is-overflowing" : ""} ${
        active ? "is-active" : ""
      } ${className}`}
      style={style}
      title={text}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {canAnimate ? (
        <motion.span
          ref={textRef}
          className="overflow-marquee-text"
          animate={{ x: active ? -overflowDistance : 0 }}
          transition={
            active
              ? {
                  duration,
                  delay: 0.32,
                  ease: "linear",
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 0.75,
                }
              : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
          }
        >
          {text}
        </motion.span>
      ) : (
        <span ref={textRef} className="overflow-marquee-text">
          {text}
        </span>
      )}
    </span>
  );
}
