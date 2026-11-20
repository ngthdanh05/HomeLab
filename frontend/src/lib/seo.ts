import type { Metadata } from "next";
import { ogLocale, pick, type Locale } from "./i18n.ts";

/** Tên thương hiệu: "San Hô Xanh" (tiếng Việt) · "BlueReef Travel" (tiếng Anh, chỉ ký tự ASCII nên dùng được trong ảnh OG). */
export const SITE_NAME = "San Hô Xanh";
export const SITE_NAME_EN = "BlueReef Travel";
export const SITE_TAGLINE = "Du lịch biển bền vững, gìn giữ từng rạn san hô";
export const SITE_DESCRIPTION =
  "Lên kế hoạch lặn ngắm san hô và du lịch biển đảo xanh, mua sản vật trực tiếp từ ngư dân và nghệ nhân làng chài, bù đắp carbon chuyến đi và cùng cộng đồng quyết định Quỹ bảo tồn biển. Mọi giao dịch được ghi công khai trên blockchain.";

const SITE_TAGLINE_EN = "Sustainable ocean travel that protects every reef";
const SITE_DESCRIPTION_EN =
  "Plan reef dives and low-impact island trips, buy seafood products and crafts directly from fishing villages, offset your trip's carbon and decide together how the Marine Conservation Fund is spent. Every transaction is recorded publicly on the blockchain.";

export const siteName = (locale: Locale) => pick(locale, SITE_NAME, SITE_NAME_EN);
export const siteTagline = (locale: Locale) => pick(locale, SITE_TAGLINE, SITE_TAGLINE_EN);
export const siteDescription = (locale: Locale) => pick(locale, SITE_DESCRIPTION, SITE_DESCRIPTION_EN);

/**
 * Absolute site origin for canonical URLs, OpenGraph and the sitemap.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is used; locally localhost.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

/** Public, indexable routes (also used by app/sitemap.ts). */
export const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/marketplace", priority: 0.9, changeFrequency: "daily" },
  { path: "/assistant", priority: 0.8, changeFrequency: "monthly" },
  { path: "/carbon-tracker", priority: 0.8, changeFrequency: "monthly" },
  { path: "/culture", priority: 0.7, changeFrequency: "monthly" },
  { path: "/heritage", priority: 0.7, changeFrequency: "monthly" },
  { path: "/getting-started", priority: 0.6, changeFrequency: "monthly" },
  { path: "/quests", priority: 0.7, changeFrequency: "weekly" },
  { path: "/governance", priority: 0.7, changeFrequency: "daily" },
  { path: "/dashboard", priority: 0.4, changeFrequency: "weekly" },
  { path: "/transparency", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
] as const;

/**
 * Per-page metadata: title (completed by the root template), description,
 * canonical URL and matching OpenGraph / Twitter fields. Child `openGraph`
 * replaces the parent's object, so every page sets the full set here.
 */
export function pageMetadata({
  title,
  description,
  path,
  locale = "vi",
}: {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
}): Metadata {
  const name = siteName(locale);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: name,
      title: `${title} — ${name}`,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${name}`,
      description,
    },
  };
}
