// Framework-free language helpers, shared by server code, client code and unit tests.

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

/** Read on the server so the first HTML is already in the chosen language. */
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The cookie is user-editable, so anything unknown falls back to the default. */
export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Picks the text for `locale`; the Vietnamese and English text stay side by side at the call site. */
export function pick<T>(locale: Locale, vi: T, en: T): T {
  return locale === "en" ? en : vi;
}

/** BCP 47 tag for number and date formatting. */
export function intlLocale(locale: Locale): "vi-VN" | "en-US" {
  return locale === "en" ? "en-US" : "vi-VN";
}

/** OpenGraph `og:locale` value. */
export function ogLocale(locale: Locale): "vi_VN" | "en_US" {
  return locale === "en" ? "en_US" : "vi_VN";
}
