"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

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
  return (
    <header className="page-hero discovery-hero">
      {children && (
        <motion.div
          initial={false}
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
          initial={false}
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h1
        initial={false}
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.65 }}
      >
        {title}
      </motion.h1>
      {description && (
        <motion.p
          className="page-hero-description"
          initial={false}
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.65 }}
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
  return (
    <main className={`discovery-page ${className}`}>
      <div className="discovery-page-stage">
        <div className="discovery-page-hero">{hero}</div>
        {(search || controls) && (
          <div className="discovery-page-controls">
          {search && (
            <motion.div
              initial={false}
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65 }}
            >
              {search}
            </motion.div>
          )}
          {controls && (
            <motion.div
              initial={false}
              animate="visible"
              variants={reveal}
              transition={{ duration: 0.65 }}
            >
              {controls}
            </motion.div>
          )}
          </div>
        )}
      </div>
      <motion.div
        className="discovery-page-content"
        initial={false}
        animate="visible"
        variants={reveal}
        transition={{ duration: 0.65 }}
      >
        {children}
      </motion.div>
    </main>
  );
}
