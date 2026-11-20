import type { Metadata } from "next";
import { SectionMain } from "@/components/layout/SectionMain";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata({
    title: pick(locale, "Bắt đầu với ví", "Getting started with a wallet"),
    description: pick(
      locale,
      "Hướng dẫn người mới: cài ví MetaMask, chuyển sang mạng thử nghiệm Sepolia và nhận ETH thử nghiệm miễn phí để dùng thử.",
      "A beginner's guide: install MetaMask, switch to the Sepolia test network and get free test ETH to try the app.",
    ),
    path: "/getting-started",
    locale,
  });
}

export default function GettingStartedLayout({ children }: { children: React.ReactNode }) {
  return <SectionMain>{children}</SectionMain>;
}
