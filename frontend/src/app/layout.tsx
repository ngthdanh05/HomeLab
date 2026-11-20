import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { NetworkBanner, SiteFooter, TestnetBanner } from "@/components/layout/SiteChrome";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ogLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getSiteUrl, siteDescription, siteName, siteTagline } from "@/lib/seo";
import { LocaleProvider } from "../providers/LocaleProvider";
import { Web3Provider } from "../providers/Web3Provider";

// Self-hosted at build time (no CSP change); the "vietnamese" subset keeps diacritics in the same face as the base glyphs.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const tagline = siteTagline(locale);
  const description = siteDescription(locale);
  const name = siteName(locale);
  return {
    metadataBase: getSiteUrl(),
    title: {
      default: `${name} — ${tagline}`,
      template: `%s — ${name}`,
    },
    description,
    applicationName: name,
    keywords: [
      "du lịch sinh thái",
      "du lịch bền vững",
      "eco-tourism",
      "sustainable travel",
      "D2C",
      "nghệ nhân",
      "artisans",
      "carbon offset",
      "NFT",
      "DAO",
      "blockchain",
      "Web3",
      "du lịch biển",
      "lặn ngắm san hô",
      "bảo tồn rạn san hô",
      "làng chài",
      "Cù Lao Chàm",
      "Hòn Mun",
      "Côn Đảo",
      "Phú Quốc",
      "marine conservation",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: name,
      title: `${name} — ${tagline}`,
      description,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${tagline}`,
      description,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F9F9",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={beVietnamPro.variable}>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-text antialiased">
        <LocaleProvider initialLocale={locale}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-overlay"
          >
            {locale === "vi" ? "Bỏ qua tới nội dung chính" : "Skip to main content"}
          </a>
          <TestnetBanner />
          <Web3Provider>
            <SiteHeader />
            <NetworkBanner />
            {children}
            <MobileTabBar />
          </Web3Provider>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
