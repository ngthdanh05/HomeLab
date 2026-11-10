import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ proposalId: string }> };

// The page itself is a client component (reads the proposal on-chain), so the
// per-proposal canonical URL and title live here.
export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const id = /^\d{1,30}$/.test(params.proposalId) ? params.proposalId : "";
  return pageMetadata({
    title: id ? `Đề xuất DAO #${id}` : "Đề xuất DAO",
    description:
      "Đề xuất giải ngân Quỹ Cộng đồng cho dự án bảo tồn: số ETH yêu cầu, phiếu Đồng ý/Phản đối bằng EcoToken và trạng thái thực thi on-chain.",
    path: `/governance/${id || params.proposalId}`,
  });
}

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
