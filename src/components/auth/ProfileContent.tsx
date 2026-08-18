"use client";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { PageContainer } from "@/components/layout/PageContainer";
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
    <main className="profile-page">
      <PageContainer className="profile-container">
        <PageHero
          eyebrow={t.auth.profile}
          title={displayName}
          description={email}
        />
        <section className="profile-surface">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2>{displayName}</h2>
              <p title={email}>{email}</p>
            </div>
          </div>
          <dl className="profile-stats">
            <div>
              <dt>{t.auth.listCount}</dt>
              <dd>{animeListCount}</dd>
            </div>
            <div>
              <dt>{t.auth.historyCount}</dt>
              <dd>{progressCount}</dd>
            </div>
          </dl>
          <dl className="profile-details">
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
          </dl>
          <div className="profile-actions">
            <SignOutButton />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
