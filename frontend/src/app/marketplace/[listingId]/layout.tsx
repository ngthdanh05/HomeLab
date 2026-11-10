import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ listingId: string }> };

// The page itself is a client component (reads the listing on-chain), so the
// per-listing canonical URL and title live here.
export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const id = /^\d{1,30}$/.test(params.listingId) ? params.listingId : "";
  const locale = await getLocale();
  const noun = pick(locale, "Sản phẩm", "Product");
  return pageMetadata({
    title: id ? `${noun} #${id}` : noun,
    description: pick(
      locale,
      "Sản phẩm thủ công, đặc sản hoặc tour trải nghiệm bán trực tiếp bởi nghệ nhân; tiền thanh toán tự chia 70% nghệ nhân / 20% Quỹ Cộng đồng / 10% nền tảng.",
      "A handicraft, local specialty or experience tour sold directly by an artisan; payment is split automatically: 70% artisan, 20% Community Treasury, 10% platform.",
    ),
    path: `/marketplace/${id || params.listingId}`,
    locale,
  });
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
