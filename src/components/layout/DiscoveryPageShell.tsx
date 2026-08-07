"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function DiscoveryPageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const initial = reduced ? false : "hidden";

  return (
    <header className="page-hero discovery-hero">
      {children && (
        <motion.div
          initial={initial}
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          {children}
        </motion.div>
      )}
      {eyebrow && (
        <motion.p
          className="eyebrow"
          initial={initial}
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h1
        initial={initial}
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.65, delay: reduced ? 0 : 0.08 }}
      >
        {title}
      </motion.h1>
      {description && (
        <motion.p
          className="page-hero-description"
          initial={initial}
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.65, delay: reduced ? 0 : 0.16 }}
        >
          {description}
        </motion.p>
      )}
    </header>
  );
}

export function DiscoveryPageShell({
  hero,
  search,
  controls,
  children,
  className = "",
}: {
  hero: ReactNode;
  search?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const initial = reduced ? false : "hidden";

  return (
    <main className={`discovery-page ${className}`}>
      <div className="discovery-page-hero">{hero}</div>
      {(search || controls) && (
        <div className="discovery-page-controls">
          {search && (
            <motion.div
              initial={initial}
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: reduced ? 0 : 0.26 }}
            >
              {search}
            </motion.div>
          )}
          {controls && (
            <motion.div
              initial={initial}
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65, delay: reduced ? 0 : 0.34 }}
            >
              {controls}
            </motion.div>
          )}
        </div>
      )}
      <motion.div
        className="discovery-page-content"
        initial={initial}
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.65, delay: reduced ? 0 : 0.44 }}
      >
        {children}
      </motion.div>
    </main>
  );
}
