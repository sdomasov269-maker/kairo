"use client";

import { useEffect, useRef } from "react";
import styles from "./HeroStarField.module.css";

type Star = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  phase: number;
  speed: number;
  driftX: number;
  driftY: number;
};

type Meteor = {
  x: number;
  y: number;
  length: number;
  angle: number;
  duration: number;
  startedAt: number;
};

const FULL_HD_STAR_COUNT = 56;
const MIN_STAR_COUNT = 24;
const METEOR_DELAY_MIN = 5_000;
const METEOR_DELAY_MAX = 14_000;

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function HeroStarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteorAt = 0;
    let animationFrame = 0;

    const scheduleMeteor = (now: number) => {
      nextMeteorAt =
        now +
        METEOR_DELAY_MIN +
        Math.random() * (METEOR_DELAY_MAX - METEOR_DELAY_MIN);
    };

    const rebuildStars = () => {
      const random = mulberry32(Math.round(width * 17 + height * 31));
      const count = Math.max(
        MIN_STAR_COUNT,
        Math.round(
          FULL_HD_STAR_COUNT * Math.sqrt((width * height) / (1920 * 1080)),
        ),
      );

      stars = Array.from({ length: count }, () => ({
        x: Math.pow(random(), 1.38) * 0.7,
        y: 0.06 + random() * 0.82,
        radius: 0.45 + Math.pow(random(), 2.5) * 1.35,
        opacity: 0.1 + random() * 0.25,
        phase: random() * Math.PI * 2,
        speed: 0.00025 + random() * 0.00034,
        driftX: (random() - 0.5) * 3.5,
        driftY: (random() - 0.5) * 2.5,
      }));
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildStars();
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);

      for (const star of stars) {
        const wave = reducedMotion
          ? 0
          : Math.sin(now * star.speed + star.phase);
        const alpha = star.opacity * (0.82 + wave * 0.18);
        const x =
          star.x * width +
          (reducedMotion
            ? 0
            : Math.sin(now * 0.000035 + star.phase) * star.driftX);
        const y =
          star.y * height +
          (reducedMotion
            ? 0
            : Math.cos(now * 0.00003 + star.phase) * star.driftY);

        context.beginPath();
        context.fillStyle = `rgba(202, 244, 247, ${alpha})`;
        context.shadowColor = "rgba(135, 224, 230, 0.42)";
        context.shadowBlur = star.radius * 3;
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.shadowBlur = 0;

      if (!reducedMotion && !meteor && now >= nextMeteorAt) {
        meteor = {
          x: width * (0.1 + Math.random() * 0.35),
          y: height * (0.1 + Math.random() * 0.38),
          length: 50 + Math.random() * 90,
          angle: 0.55 + Math.random() * 0.2,
          duration: 600 + Math.random() * 600,
          startedAt: now,
        };
      }

      if (meteor) {
        const progress = (now - meteor.startedAt) / meteor.duration;
        if (progress >= 1) {
          meteor = null;
          scheduleMeteor(now);
        } else {
          const distance = meteor.length * 1.15 * progress;
          const headX = meteor.x + Math.cos(meteor.angle) * distance;
          const headY = meteor.y + Math.sin(meteor.angle) * distance;
          const tailX = headX - Math.cos(meteor.angle) * meteor.length;
          const tailY = headY - Math.sin(meteor.angle) * meteor.length;
          const fade = Math.sin(progress * Math.PI) * 0.42;
          const gradient = context.createLinearGradient(
            tailX,
            tailY,
            headX,
            headY,
          );
          gradient.addColorStop(0, "rgba(177, 236, 241, 0)");
          gradient.addColorStop(0.84, `rgba(193, 242, 246, ${fade * 0.55})`);
          gradient.addColorStop(1, `rgba(235, 253, 255, ${fade})`);
          context.beginPath();
          context.strokeStyle = gradient;
          context.lineWidth = 1;
          context.moveTo(tailX, tailY);
          context.lineTo(headX, headY);
          context.stroke();
        }
      }

      if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      cancelAnimationFrame(animationFrame);
      meteor = null;
      if (reducedMotion) draw(performance.now());
      else {
        scheduleMeteor(performance.now());
        animationFrame = requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    motionQuery.addEventListener("change", handleMotionChange);
    resize();
    scheduleMeteor(performance.now());
    draw(performance.now());

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      stars = [];
      meteor = null;
    };
  }, []);

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  );
}
