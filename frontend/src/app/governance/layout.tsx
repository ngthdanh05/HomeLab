import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Quỹ bảo tồn biển", "Ocean Conservation Fund"),
    description: pick(
      locale,
      "Cộng đồng đề xuất và bỏ phiếu bằng ECO để giải ngân Quỹ bảo tồn biển cho các dự án bảo tồn, ghi công khai và minh bạch.",
      "The community proposes and votes with EcoToken to disburse the Ocean Conservation Fund to conservation projects, transparently on-chain.",
    ),
    path: "/governance",
    locale,
  });
}

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
