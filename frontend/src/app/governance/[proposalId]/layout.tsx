import type { Metadata } from "next";
import { pick } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ proposalId: string }> };

// The page itself is a client component (reads the proposal on-chain), so the
// per-proposal canonical URL and title live here.
export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const id = /^\d{1,30}$/.test(params.proposalId) ? params.proposalId : "";
  const locale = await getLocale();
  const noun = pick(locale, "Đề xuất DAO", "DAO proposal");
  return pageMetadata({
    title: id ? `${noun} #${id}` : noun,
    description: pick(
      locale,
      "Đề xuất giải ngân Quỹ Cộng đồng cho dự án bảo tồn: số ETH yêu cầu, phiếu Đồng ý/Phản đối bằng EcoToken và trạng thái thực thi on-chain.",
      "A proposal to disburse the Community Treasury to a conservation project: ETH requested, For/Against votes in EcoToken and on-chain execution status.",
    ),
    path: `/governance/${id || params.proposalId}`,
    locale,
  });
}

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
