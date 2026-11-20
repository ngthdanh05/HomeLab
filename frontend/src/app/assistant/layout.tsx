import type { Metadata } from "next";
import { SectionMain } from "@/components/layout/SectionMain";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Trợ lý lặn & du lịch biển", "Diving & ocean travel assistant"),
    description: pick(
      locale,
      "Hỏi trợ lý về mùa lặn ngắm san hô, lịch trình biển đảo ít phát thải và cách đi biển không rác nhựa ở Cù Lao Chàm, Hòn Mun, Côn Đảo, Phú Quốc.",
      "Ask about reef snorkelling seasons, low-carbon island itineraries and plastic-free beach trips in Cu Lao Cham, Hon Mun, Con Dao and Phu Quoc.",
    ),
    path: "/assistant",
    locale,
  });
}

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return <SectionMain>{children}</SectionMain>;
}
