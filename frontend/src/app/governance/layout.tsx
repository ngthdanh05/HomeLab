import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Community DAO",
  description:
    "Cộng đồng đề xuất và bỏ phiếu bằng EcoToken để giải ngân Quỹ Cộng đồng cho các dự án bảo tồn, minh bạch on-chain.",
  path: "/governance",
});

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
