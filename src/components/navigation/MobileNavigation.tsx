"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { forwardRef } from "react";

interface MobileNavigationProps {
  links: string[];
  hrefs: string[];
  open: boolean;
  pathname: string;
  onNavigate: () => void;
}

export const MobileNavigation = forwardRef<HTMLElement, MobileNavigationProps>(
  function MobileNavigation(
    { links, hrefs, open, pathname, onNavigate }: MobileNavigationProps,
    ref,
  ) {
    const isActive = (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <AnimatePresence>
        {open && (
          <motion.nav
            ref={ref}
            className="mobile-nav"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {links.map((link, index) => (
              <Link
                className={isActive(hrefs[index]) ? "active" : ""}
                aria-current={isActive(hrefs[index]) ? "page" : undefined}
                href={hrefs[index]}
                onClick={onNavigate}
                key={link}
              >
                {link}
                <span>0{index + 1}</span>
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    );
  },
);
