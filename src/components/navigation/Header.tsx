"use client";

import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { useLocale } from "@/i18n";
import { GlobalSearch } from "./GlobalSearch";
import { HeaderAccountMenu } from "./HeaderAccountMenu";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { locale, setLocale, dictionary: t } = useLocale();
  const links = [t.nav.home, t.nav.catalog, t.nav.releases, t.nav.collections];
  const hrefs = ["/", "/catalog", "/new", "/collections"];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        mobileNavRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="header-inner">
        <Link className="logo" href="/" aria-label={`Kairo — ${t.nav.home}`}>
          kairo<span>.</span>
        </Link>
        <nav className="desktop-nav" aria-label={t.nav.openMenu}>
          {links.map((link, index) => (
            <Link
              className={isActive(hrefs[index]) ? "active" : ""}
              aria-current={isActive(hrefs[index]) ? "page" : undefined}
              href={hrefs[index]}
              key={link}
            >
              {link}
            </Link>
          ))}
        </nav>
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
          <IconButton
            ref={menuButtonRef}
            label={open ? t.nav.closeMenu : t.nav.openMenu}
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
      </div>
      <MobileNavigation
        ref={mobileNavRef}
        links={links}
        hrefs={hrefs}
        open={open}
        pathname={pathname}
        onNavigate={() => setOpen(false)}
      />
      {open && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label={t.nav.closeMenu}
          onClick={() => setOpen(false)}
        />
      )}
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        triggerRef={searchRef}
      />
    </header>
  );
}
