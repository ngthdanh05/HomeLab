import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: "Eco Quests",
    description: pick(
      locale,
      "Hoàn thành nhiệm vụ du lịch bền vững để nhận thêm EcoToken và mở khoá ImpactBadge hiếm, xác minh on-chain.",
      "Complete sustainable travel quests to earn extra EcoToken and unlock rare ImpactBadges, verified on-chain.",
    ),
    path: "/quests",
    locale,
  });
}

export default function QuestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
