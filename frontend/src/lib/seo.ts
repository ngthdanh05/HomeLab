import type { Metadata } from "next";

export const SITE_NAME = "MyHomeLab";
export const SITE_TAGLINE = "Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo";
export const SITE_DESCRIPTION =
  "Du lịch sinh thái tuần hoàn trên blockchain: mua trực tiếp từ nghệ nhân (chia doanh thu 70/20/10 bằng Smart Contract), bù đắp carbon, nhận EcoToken và NFT ImpactBadge, DAO Quỹ Cộng đồng, AI Travel Assistant và di sản 360°.";

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
  { path: "/carbon-tracker", priority: 0.8, changeFrequency: "monthly" },
  { path: "/quests", priority: 0.7, changeFrequency: "weekly" },
  { path: "/governance", priority: 0.7, changeFrequency: "daily" },
  { path: "/dashboard", priority: 0.4, changeFrequency: "weekly" },
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
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title: `${title} — ${SITE_NAME}`,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
    },
  };
}
