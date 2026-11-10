import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: "Carbon Tracker",
    description: pick(
      locale,
      "Tính lượng CO₂ của chuyến đi, ước tính bằng AI và bù đắp on-chain để nhận NFT ZERO_CARBON.",
      "Calculate your trip's CO₂, estimate it with AI and offset it on-chain to receive a ZERO_CARBON NFT.",
    ),
    path: "/carbon-tracker",
    locale,
  });
}

export default function CarbonTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
