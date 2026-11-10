"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, pick } from "@/lib/i18n";

const noopSubscribe = () => () => {};

function readCookieLocale() {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return normalizeLocale(entry?.slice(LOCALE_COOKIE.length + 1));
}

/** Replaces the root layout when the layout itself fails, so it must render <html> (and has no LocaleProvider). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useSyncExternalStore(noopSubscribe, readCookieLocale, () => DEFAULT_LOCALE);
  const t = (vi: string, en: string) => pick(locale, vi, en);
  return (
    <html lang={locale}>
      <body style={{ background: "#020617", color: "#f1f5f9", fontFamily: "sans-serif", textAlign: "center", padding: "20vh 16px" }}>
        <h1>{t("Đã xảy ra lỗi", "Something went wrong")}</h1>
        <p>{t("Ứng dụng chưa tải được. Vui lòng thử lại sau ít phút.", "The app could not be loaded. Please try again in a few minutes.")}</p>
        <button type="button" onClick={reset} style={{ padding: "10px 20px", cursor: "pointer" }}>
          {t("Thử lại", "Try again")}
        </button>
      </body>
    </html>
  );
}
