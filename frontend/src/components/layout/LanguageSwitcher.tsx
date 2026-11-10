"use client";

import React from "react";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

// Drawn as SVG because Windows browsers render flag emoji as plain letters.
function VietnamFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 rounded-[2px]" aria-hidden>
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        fill="#ffff00"
        points="15,4 16.76,9.57 22.61,9.53 17.85,12.93 19.7,18.47 15,15 10.3,18.47 12.15,12.93 7.39,9.53 13.24,9.57"
      />
    </svg>
  );
}

function BritishFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 rounded-[2px]" aria-hidden>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6.5" />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.5" />
    </svg>
  );
}

const OPTIONS: { locale: Locale; code: string; name: string; Flag: () => React.JSX.Element }[] = [
  { locale: "vi", code: "VI", name: "Tiếng Việt", Flag: VietnamFlag },
  { locale: "en", code: "EN", name: "English", Flag: BritishFlag },
];

/** Vietnamese / English toggle; each option is labelled in its own language. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("Chọn ngôn ngữ", "Choose language")}
      className="flex h-10 items-center gap-0.5 rounded-xl bg-slate-800 p-1"
    >
      {OPTIONS.map(({ locale: option, code, name, Flag }) => (
        <button
          key={option}
          type="button"
          lang={option}
          title={name}
          aria-label={name}
          aria-pressed={locale === option}
          onClick={() => {
            if (locale !== option) setLocale(option);
          }}
          className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            locale === option ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Flag />
          <span className="hidden sm:inline">{code}</span>
        </button>
      ))}
    </div>
  );
}
