import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Chợ làng chài", "Village Market"),
    description: pick(
      locale,
      "Mua đồ thủ công, đặc sản và tour trải nghiệm trực tiếp từ nghệ nhân. Doanh thu được hợp đồng tự động chia minh bạch.",
      "Buy handicrafts, local specialties and experience tours directly from artisans. Revenue is split transparently by smart contract.",
    ),
    path: "/marketplace",
    locale,
  });
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
