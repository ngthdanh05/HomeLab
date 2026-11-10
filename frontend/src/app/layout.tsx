import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, TestnetBanner } from "@/components/layout/SiteChrome";
import { ogLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getSiteUrl, SITE_NAME, siteDescription, siteTagline } from "@/lib/seo";
import { LocaleProvider } from "../providers/LocaleProvider";
import { Web3Provider } from "../providers/Web3Provider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const tagline = siteTagline(locale);
  const description = siteDescription(locale);
  return {
    metadataBase: getSiteUrl(),
    title: {
      default: `${SITE_NAME} — ${tagline}`,
      template: `%s — ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
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
      "Hội An",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: SITE_NAME,
      title: `${SITE_NAME} — ${tagline}`,
      description,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — ${tagline}`,
      description,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
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
    <html lang={locale}>
      <body className="font-sans bg-slate-950 text-slate-100 min-h-screen antialiased">
        <LocaleProvider initialLocale={locale}>
          <TestnetBanner />
          <Web3Provider>{children}</Web3Provider>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
