import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Của tôi", "My Page"),
    description: pick(
      locale,
      "Số dư ECO, bộ sưu tập Huy hiệu tác động và lịch sử giao dịch của bạn.",
      "Your EcoToken balance, ImpactBadge NFT collection and on-chain transaction history.",
    ),
    path: "/dashboard",
    locale,
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
