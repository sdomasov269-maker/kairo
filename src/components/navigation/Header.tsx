"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";
import { NavigationDock } from "@/components/navigation/NavigationDock";
import { useLocale } from "@/i18n";
import { GlobalSearch } from "./GlobalSearch";
import { HeaderAccountMenu } from "./HeaderAccountMenu";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);
  const { locale, setLocale, dictionary: t } = useLocale();

  return (
    <>
    <header className="site-header">
      <div className="header-inner">
        <Link className="logo" href="/" aria-label={`Kairo — ${t.nav.home}`}>
          kairo<span>.</span>
        </Link>
        <div className="header-actions">
          <div className="locale-switch" aria-label={t.sync.subtitleLanguage}>
            <button
              className={locale === "ru" ? "active" : ""}
              onClick={() => setLocale("ru")}
            >
              RU
            </button>
            <span>/</span>
            <button
              className={locale === "uk" ? "active" : ""}
              onClick={() => setLocale("uk")}
            >
              UK
            </button>
            <span>/</span>
            <button
              className={locale === "en" ? "active" : ""}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
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
