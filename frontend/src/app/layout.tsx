import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Web3Provider } from "../providers/Web3Provider";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "du lịch sinh thái",
    "du lịch bền vững",
    "D2C",
    "nghệ nhân",
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
    locale: "vi_VN",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans bg-slate-950 text-slate-100 min-h-screen antialiased">
        <p role="note" className="bg-amber-900/60 px-4 py-1.5 text-center text-xs text-amber-100">
          ⚠️ Bản thử nghiệm trên testnet: tài sản không có giá trị thực, smart contract chưa được kiểm toán.
        </p>
        <Web3Provider>{children}</Web3Provider>
        <footer className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-400">
          <Link href="/terms" className="hover:text-emerald-400">
            Điều khoản sử dụng
          </Link>
          <span aria-hidden> · </span>
          <Link href="/privacy" className="hover:text-emerald-400">
            Chính sách riêng tư
          </Link>
        </footer>
      </body>
    </html>
  );
}
