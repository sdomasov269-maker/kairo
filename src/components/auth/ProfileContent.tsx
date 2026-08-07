"use client";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { PageHero } from "@/components/ui/PageHero";
import { useLocale } from "@/i18n";

export function ProfileContent({
  displayName,
  email,
  role,
  createdAt,
  lastLoginAt,
  animeListCount,
  progressCount,
}: {
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  animeListCount: number;
  progressCount: number;
}) {
  const { locale, dictionary: t } = useLocale();
  const dateLocale =
    locale === "ru" ? "ru-RU" : locale === "uk" ? "uk-UA" : "en-GB";
  return (
    <main className="account-page">
      <section>
        <PageHero eyebrow={t.auth.profile} title={displayName} />
        <div className="profile-avatar" aria-hidden="true">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <p>{email}</p>
        <dl>
          <div>
            <dt>{t.auth.role}</dt>
            <dd>{role}</dd>
          </div>
          <div>
            <dt>{t.auth.registered}</dt>
            <dd>{new Date(createdAt).toLocaleDateString(dateLocale)}</dd>
          </div>
          <div>
            <dt>{t.auth.lastLogin}</dt>
            <dd>
              {lastLoginAt
                ? new Date(lastLoginAt).toLocaleString(dateLocale)
                : "—"}
            </dd>
          </div>
          <div>
            <dt>{t.auth.listCount}</dt>
            <dd>{animeListCount}</dd>
          </div>
          <div>
            <dt>{t.auth.historyCount}</dt>
            <dd>{progressCount}</dd>
          </div>
        </dl>
        <SignOutButton />
      </section>
    </main>
  );
}
