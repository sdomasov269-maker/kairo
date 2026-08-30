"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "@/i18n/dictionaries/en";
import { ru } from "@/i18n/dictionaries/ru";
import { uk } from "@/i18n/dictionaries/uk";
import type { Dictionary, Locale } from "@/i18n/types";

interface LocaleContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
}
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("ru");

  useEffect(() => {
    const stored = window.localStorage.getItem("kairo-locale");
    const nextLocale: Locale =
      stored === "en" || stored === "uk" ? stored : "ru";
    const timer = window.setTimeout(() => {
      updateLocale(nextLocale);
      document.documentElement.lang = nextLocale;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setLocale = (nextLocale: Locale) => {
    updateLocale(nextLocale);
    window.localStorage.setItem("kairo-locale", nextLocale);
    document.documentElement.lang = nextLocale;
  };
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dictionary: locale === "ru" ? ru : locale === "uk" ? uk : en,
      setLocale,
    }),
    [locale],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
