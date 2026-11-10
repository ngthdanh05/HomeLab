"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SECONDS, pick, type Locale } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Returns the argument for the current language: t("Xin chào", "Hello"). */
  t: <T,>(vi: T, en: T) => T;
}

const I18nContext = createContext<I18nValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax${secure}`;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocaleCookie(next);
      setLocaleState(next);
      document.documentElement.lang = next;
      // Client components switch immediately; this re-renders server parts (tab title, legal pages).
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: <T,>(vi: T, en: T) => pick(locale, vi, en) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <LocaleProvider>");
  return ctx;
}
