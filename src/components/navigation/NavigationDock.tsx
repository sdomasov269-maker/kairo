"use client";

import { Bookmark, Clapperboard, Compass, House, Layers3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocale } from "@/i18n";

const desktopIdleDelay = 1800;
const mobileOpenDuration = 440;
const mobileCloseDuration = 360;
const mobileAutoHideDelay = 3500;

type MobileNavState = "hidden" | "opening" | "open" | "closing";

export function NavigationDock() {
  const pathname = usePathname();
  const { locale, dictionary: t } = useLocale();
  const [desktopIdle, setDesktopIdle] = useState(false);
  const [mobileState, setMobileState] = useState<MobileNavState>("hidden");
  const capsuleRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const phaseTimer = useRef(0);
  const autoHideTimer = useRef(0);

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
      label:
        locale === "ru" ? "История" : locale === "uk" ? "Історія" : "History",
      icon: Clapperboard,
    },
  ];

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let timeout = 0;
    const scheduleIdle = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setDesktopIdle(true), desktopIdleDelay);
    };
    const wake = () => {
      setDesktopIdle(false);
      scheduleIdle();
    };
    const sync = () => {
      window.clearTimeout(timeout);
      if (pointer.matches) scheduleIdle();
      else setDesktopIdle(false);
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

  const clearMobileTimers = useCallback(() => {
    window.clearTimeout(phaseTimer.current);
    window.clearTimeout(autoHideTimer.current);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileState((current) => {
      if (current === "hidden" || current === "closing") return current;
      clearMobileTimers();
      phaseTimer.current = window.setTimeout(
        () => setMobileState("hidden"),
        mobileCloseDuration,
      );
      return "closing";
    });
  }, [clearMobileTimers]);

  const scheduleMobileAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimer.current);
    autoHideTimer.current = window.setTimeout(closeMobile, mobileAutoHideDelay);
  }, [closeMobile]);

  useEffect(() => {
    const timeout = window.setTimeout(closeMobile, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname, closeMobile]);

  const openMobile = useCallback(() => {
    clearMobileTimers();
    setMobileState("opening");
    phaseTimer.current = window.setTimeout(() => {
      setMobileState("open");
      scheduleMobileAutoHide();
    }, mobileOpenDuration);
  }, [clearMobileTimers, scheduleMobileAutoHide]);

  useEffect(() => clearMobileTimers, [clearMobileTimers]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        capsuleRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closeMobile();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", closeMobile, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", closeMobile);
    };
  }, [closeMobile]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const mobileExpanded = mobileState === "opening" || mobileState === "open";

  return (
    <>
      <nav
        className={desktopIdle ? "navigation-dock is-idle" : "navigation-dock"}
        aria-label={locale === "ru" ? "Основная навигация" : "Main navigation"}
        onPointerEnter={() => setDesktopIdle(false)}
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

      <button
        ref={triggerRef}
        className="mobile-nav-trigger"
        type="button"
        aria-label={
          locale === "ru"
            ? "Открыть навигацию"
            : locale === "uk"
              ? "Відкрити навігацію"
              : "Open navigation"
        }
        aria-controls="kairo-mobile-navigation"
        aria-expanded={mobileExpanded}
        onClick={openMobile}
      />

      <nav
        id="kairo-mobile-navigation"
        ref={capsuleRef}
        className={`mobile-liquid-nav is-${mobileState}`}
        aria-label={
          locale === "ru" ? "Мобильная навигация" : "Mobile navigation"
        }
        aria-hidden={mobileState === "hidden" ? true : undefined}
        inert={mobileState === "hidden" ? true : undefined}
        onPointerMove={scheduleMobileAutoHide}
        onPointerDown={scheduleMobileAutoHide}
        onFocus={scheduleMobileAutoHide}
        onKeyDown={scheduleMobileAutoHide}
      >
        <div className="mobile-liquid-capsule">
          {links.map(({ href, icon: Icon, label }, index) => {
            const active = isActive(href);
            return (
              <Link
                className={active ? "is-active" : ""}
                href={href}
                aria-current={active ? "page" : undefined}
                key={href}
                style={{ "--mobile-nav-index": index } as CSSProperties}
              >
                <span className="mobile-nav-icon">
                  <Icon size={18} strokeWidth={1.65} aria-hidden="true" />
                </span>
                <span className="mobile-nav-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
