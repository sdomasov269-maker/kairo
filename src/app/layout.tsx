import type { Metadata } from "next";
import "./globals.css";
import "../styles/responsive/base.css";
import "../styles/responsive/mobile.css";
import "../styles/responsive/tablet-fold.css";
import "../styles/responsive/desktop.css";
import "lenis/dist/lenis.css";
import { LocaleProvider } from "@/i18n";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { AppBackground } from "@/components/layout/AppBackground";
import { Header } from "@/components/navigation/Header";
import { KairoWebGLEnvironment } from "@/components/webgl/KairoWebGLEnvironment";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Kairo — аниме, которое стоит сохранить",
  description:
    "Современная платформа для просмотра, открытия и коллекционирования аниме.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kairo — аниме, которое стоит сохранить",
    description:
      "Современная платформа для просмотра, открытия и коллекционирования аниме.",
    type: "website",
    locale: "ru_RU",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>
        <AppBackground />
        <LocaleProvider>
          <SessionProvider>
            <KairoWebGLEnvironment>
              <Header />
              <div className="global-page-content">{children}</div>
            </KairoWebGLEnvironment>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
