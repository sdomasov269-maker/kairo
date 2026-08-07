const DEVELOPMENT_SITE_URL = "http://localhost:3000";
const PRODUCTION_SITE_URL = "https://kairo-anime.com";

function normalizeSiteUrl(value: string): string {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();

  if (configured) return normalizeSiteUrl(configured);
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : DEVELOPMENT_SITE_URL;
}

export const siteUrl = getSiteUrl();
