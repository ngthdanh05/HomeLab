import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: "Dashboard",
    description: pick(
      locale,
      "Số dư EcoToken, bộ sưu tập NFT ImpactBadge và lịch sử giao dịch on-chain của bạn.",
      "Your EcoToken balance, ImpactBadge NFT collection and on-chain transaction history.",
    ),
    path: "/dashboard",
    locale,
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
