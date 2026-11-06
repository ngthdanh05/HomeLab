import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Eco Quests",
  description:
    "Hoàn thành nhiệm vụ du lịch bền vững để nhận thêm EcoToken và mở khoá ImpactBadge hiếm, xác minh on-chain.",
  path: "/quests",
});

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
