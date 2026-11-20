import type { Metadata } from "next";
import { SectionMain } from "@/components/layout/SectionMain";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Văn hoá làng chài & Quy tắc bảo tồn", "Fishing Village Culture & Conservation Code"),
    description: pick(
      locale,
      "Nên và không nên khi đến làng chài, quy tắc ứng xử với rạn san hô và sinh vật biển, ẩm thực, phong tục và vài câu giao tiếp địa phương.",
      "Dos and don'ts in fishing villages, how to behave around coral reefs and marine life, local food, customs and a few local phrases.",
    ),
    path: "/culture",
    locale,
  });
}

export default function CultureLayout({ children }: { children: React.ReactNode }) {
  return <SectionMain>{children}</SectionMain>;
}
