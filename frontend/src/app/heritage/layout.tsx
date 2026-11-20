import type { Metadata } from "next";
import { SectionMain } from "@/components/layout/SectionMain";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Bảo tàng San hô & Di sản biển 360°", "Coral Museum & 360° Ocean Heritage"),
    description: pick(
      locale,
      "Dạo quanh rạn san hô Hòn Mun, làng chài Cù Lao Chàm và các di sản ven biển trong không gian 360°, kèm chú giải về cách cộng đồng bảo tồn chúng.",
      "Step inside the Hon Mun coral reef, Cu Lao Cham fishing village and coastal heritage in 360°, with notes on how communities protect them.",
    ),
    path: "/heritage",
    locale,
  });
}

export default function HeritageLayout({ children }: { children: React.ReactNode }) {
  return <SectionMain>{children}</SectionMain>;
}
