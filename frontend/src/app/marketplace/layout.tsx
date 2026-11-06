import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "D2C Marketplace",
  description:
    "Mua đồ thủ công, đặc sản và tour trải nghiệm trực tiếp từ nghệ nhân. Doanh thu chia minh bạch qua Smart Contract.",
  path: "/marketplace",
});

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
