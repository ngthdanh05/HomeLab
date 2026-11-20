import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Minh bạch on-chain", "On-chain transparency"),
    description: pick(
      locale,
      "Địa chỉ các hợp đồng tự động của San Hô Xanh: mọi giao dịch mua bán, bù đắp carbon và giải ngân Quỹ bảo tồn biển đều được ghi công khai.",
      "BlueReef Travel smart contract addresses: every purchase, carbon offset and Ocean Conservation Fund disbursement is recorded publicly on-chain.",
    ),
    path: "/transparency",
    locale,
  });
}

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
