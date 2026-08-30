"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";
import { NavigationDock } from "@/components/navigation/NavigationDock";
import { useLocale } from "@/i18n";
import { GlobalSearch } from "./GlobalSearch";
import { HeaderAccountMenu } from "./HeaderAccountMenu";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);
  const { locale, setLocale, dictionary: t } = useLocale();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header
        className={`site-header${scrolled ? " is-scrolled" : ""}`}
        data-scrolled={scrolled ? "true" : "false"}
      >
        <div className="header-inner">
          <Link className="logo" href="/" aria-label={`Kairo — ${t.nav.home}`}>
            kairo<span>.</span>
          </Link>
          <div className="header-actions">
            <div
              className="locale-switch"
              role="group"
              aria-label={t.nav.languageSwitcher}
            >
              {(
                [
                  ["ru", "RU", "Русский"],
                  ["uk", "UA", "Українська"],
                  ["en", "EN", "English"],
                ] as const
              ).map(([value, shortLabel, label]) => (
                <button
                  type="button"
                  className={locale === value ? "active" : ""}
                  aria-pressed={locale === value}
                  aria-label={label}
                  title={label}
                  onClick={() => setLocale(value)}
                  key={value}
                >
                  {shortLabel}
                </button>
              ))}
            </div>
            <IconButton
              label={t.nav.search}
              ref={searchRef}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={19} />
            </IconButton>
            <HeaderAccountMenu />
          </div>
        </div>
        <GlobalSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          triggerRef={searchRef}
        />
      </header>
      <NavigationDock />
    </>
  );
}
