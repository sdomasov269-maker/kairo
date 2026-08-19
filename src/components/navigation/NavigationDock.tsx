"use client";

import { Bookmark, Clapperboard, Compass, House, Layers3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n";

const idleDelay = 1800;

export function NavigationDock() {
  const pathname = usePathname();
  const { locale, dictionary: t } = useLocale();
  const [idle, setIdle] = useState(false);
  const links = [
    { href: "/", label: t.nav.home, icon: House },
    { href: "/catalog", label: t.nav.catalog, icon: Compass },
    { href: "/collections", label: t.nav.collections, icon: Layers3 },
    {
      href: "/my-list",
      label: locale === "ru" ? "Моё" : locale === "uk" ? "Моє" : "My list",
      icon: Bookmark,
    },
    {
      href: "/history",
      label: locale === "ru" ? "История" : locale === "uk" ? "Історія" : "History",
      icon: Clapperboard,
    },
  ];

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let timeout = 0;
    const scheduleIdle = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setIdle(true), idleDelay);
    };
    const wake = () => {
      setIdle(false);
      scheduleIdle();
    };
    const sync = () => {
      window.clearTimeout(timeout);
      if (pointer.matches) scheduleIdle();
      else setIdle(false);
    };
    window.addEventListener("pointermove", wake, { passive: true });
    pointer.addEventListener("change", sync);
    sync();
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointermove", wake);
      pointer.removeEventListener("change", sync);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className={`navigation-dock${idle ? " is-idle" : ""}`}
      aria-label={locale === "ru" ? "Основная навигация" : "Main navigation"}
      onPointerEnter={() => setIdle(false)}
    >
      <div className="navigation-dock-inner">
        {links.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              className={active ? "is-active" : ""}
              href={href}
              aria-current={active ? "page" : undefined}
              key={href}
            >
              <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
