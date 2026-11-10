import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ listingId: string }> };

// The page itself is a client component (reads the listing on-chain), so the
// per-listing canonical URL and title live here.
export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const id = /^\d{1,30}$/.test(params.listingId) ? params.listingId : "";
  return pageMetadata({
    title: id ? `Sản phẩm #${id}` : "Sản phẩm",
    description:
      "Sản phẩm thủ công, đặc sản hoặc tour trải nghiệm bán trực tiếp bởi nghệ nhân; tiền thanh toán tự chia 70% nghệ nhân / 20% Quỹ Cộng đồng / 10% nền tảng.",
    path: `/marketplace/${id || params.listingId}`,
  });
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
