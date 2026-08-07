"use client";
import { useLocale } from "@/i18n";
import Link from "next/link";
export function Footer() {
  const { dictionary: t } = useLocale();
  return (
    <footer className="footer">
      <div className="footer-top">
        <Link className="logo" href="/">
          kairo<span>.</span>
        </Link>
        <p>
          {t.footer.line1}
          <br />
          {t.footer.line2}
        </p>
        <nav aria-label="Навигация в подвале">
          <Link href="/catalog">{t.nav.catalog}</Link>
          <Link href="/new">{t.nav.releases}</Link>
          <Link href="/collections">{t.nav.collections}</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>{t.footer.demo}</p>
        <div>
          <a href="#">{t.footer.terms}</a>
          <a href="#">{t.footer.privacy}</a>
        </div>
        <span>© 2026 Kairo</span>
      </div>
    </footer>
  );
}
