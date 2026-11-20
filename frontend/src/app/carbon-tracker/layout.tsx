import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Hành trình xanh", "Green Journey"),
    description: pick(
      locale,
      "Tính lượng CO₂ của chuyến đi, nhờ trợ lý ước tính và bù đắp để nhận Huy hiệu Bù đắp carbon, ghi công khai.",
      "Calculate your trip's CO₂, estimate it with AI and offset it on-chain to receive a ZERO_CARBON NFT.",
    ),
    path: "/carbon-tracker",
    locale,
  });
}

export default function CarbonTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
