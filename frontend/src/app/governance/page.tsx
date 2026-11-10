"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { CreateProposalModal } from "@/components/governance/CreateProposalModal";
import { ProposalCard } from "@/components/governance/ProposalCard";
import { formatEth, TreasuryStats } from "@/components/governance/TreasuryStats";
import { VotingPowerPanel } from "@/components/governance/VotingPowerPanel";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useChainNow, useProposals } from "@/hooks/useGovernance";
import { useTreasury } from "@/hooks/useTreasury";
import { formatDateTime } from "@/lib/dashboard";
import { PROPOSALS_PAGE_SIZE, type ProposalStatus } from "@/lib/governance";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

const FILTERS: { key: string; label: string; labelEn: string; statuses: ProposalStatus[] | null }[] = [
  { key: "all", label: "Tất cả", labelEn: "All", statuses: null },
  { key: "active", label: "🗳️ Đang bỏ phiếu", labelEn: "🗳️ Voting", statuses: ["pending", "active"] },
  { key: "pending", label: "⏳ Chờ thực thi", labelEn: "⏳ Awaiting execution", statuses: ["queued", "passed", "defeated"] },
  { key: "closed", label: "📁 Đã kết thúc", labelEn: "📁 Closed", statuses: ["executed", "rejected", "no-quorum", "expired", "cancelled"] },
];

export default function GovernancePage() {
  const { locale, t } = useI18n();
  const { chainId, explorerUrl, isWrongNetwork } = useActiveChain();
  const { address: user, isConnected } = useAccount();
  const [limit, setLimit] = useState(PROPOSALS_PAGE_SIZE);
  const { config, proposals, hasMore, isLoading, isError, refetch } = useProposals(limit);
  const treasury = useTreasury();
  const now = useChainNow();
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const activeCount = config.proposalCount === undefined ? undefined : proposals.filter((p) => p.status === "active").length;
  const visible = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    return statuses ? proposals.filter((p) => statuses.includes(p.status)) : proposals;
  }, [proposals, filter]);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-sky-900/50 bg-gradient-to-r from-sky-950/70 via-slate-900 to-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-sky-800/80 bg-sky-950/80 px-3 py-1 text-xs font-semibold text-sky-300">
              🗳️ Community DAO · {getChainName(chainId)}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t("Cộng đồng quyết định, Quỹ minh bạch", "The community decides, the Treasury stays transparent")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t(
                "20% mỗi giao dịch D2C chảy vào Quỹ Cộng đồng. Người nắm EcoToken đề xuất và bỏ phiếu cho các dự án bảo tồn; đề xuất được thông qua sẽ được Smart Contract giải ngân tự động.",
                "20% of every direct-to-consumer sale flows into the Community Treasury. EcoToken holders propose and vote on conservation projects, and the smart contract disburses funds to approved proposals automatically.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-950 transition-colors hover:bg-emerald-600"
          >
            {t("＋ Tạo đề xuất", "＋ Create proposal")}
          </button>
        </div>
      </section>

      {isWrongNetwork && (
        <p className="rounded-2xl border border-amber-800/60 bg-amber-950/40 p-4 text-sm text-amber-200">
          {t(
            `Ví đang ở mạng chưa hỗ trợ. Dữ liệu dưới đây lấy từ ${getChainName(chainId)}; khi bỏ phiếu, ví sẽ được yêu cầu chuyển mạng.`,
            `Your wallet is on an unsupported network. The data below comes from ${getChainName(chainId)}; your wallet will be asked to switch networks when you vote.`,
          )}
        </p>
      )}

      <TreasuryStats
        balance={treasury.balance}
        totalDisbursed={treasury.totalDisbursed}
        disbursementCount={treasury.disbursementCount}
        activeCount={activeCount}
        totalProposals={config.proposalCount}
        proposalThreshold={config.proposalThreshold}
        quorumBps={config.quorumBps}
        votingPeriod={config.votingPeriod}
        treasuryAddress={treasury.address}
        explorerUrl={explorerUrl}
      />

      {isConnected && user && <VotingPowerPanel user={user} />}

      <section aria-labelledby="proposals-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="proposals-heading" className="text-xl font-bold text-white">
            {t("Đề xuất dự án bảo tồn", "Conservation project proposals")}
          </h2>
          <div role="tablist" aria-label={t("Lọc đề xuất", "Filter proposals")} className="flex gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t(f.label, f.labelEn)}
              </button>
            ))}
          </div>
        </div>

        {isError && (
          <p className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
            {t("Không đọc được dữ liệu DAO (RPC có thể đang quá tải).", "Could not read DAO data (the RPC may be overloaded).")}{" "}
            <button type="button" onClick={refetch} className="font-semibold underline">
              {t("Thử lại", "Try again")}
            </button>
          </p>
        )}

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label={t("Đang tải đề xuất", "Loading proposals")}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-900" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
            <p className="text-4xl">🌱</p>
            <p className="mt-3 font-semibold text-slate-200">
              {proposals.length === 0 ? t("Chưa có đề xuất nào", "No proposals yet") : t("Không có đề xuất nào ở mục này", "No proposals in this category")}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {proposals.length === 0 && t("Hãy là người đầu tiên đề xuất một dự án bảo tồn cho cộng đồng.", "Be the first to propose a conservation project for the community.")}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => (
              <ProposalCard key={p.id.toString()} proposal={p} now={now} />
            ))}
          </div>
        )}
        {hasMore && !isError && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setLimit((n) => n + PROPOSALS_PAGE_SIZE)}
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              {t("Xem thêm đề xuất", "Show more proposals")}
            </button>
          </div>
        )}
      </section>

      {treasury.disbursements.length > 0 && (
        <section aria-labelledby="disbursements-heading" className="space-y-3">
          <h2 id="disbursements-heading" className="text-xl font-bold text-white">
            💸 {t("Lịch sử giải ngân", "Disbursement history")}
          </h2>
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            {treasury.disbursements.map((d) => (
              <li key={d.index} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <Link href={`/governance/${d.proposalId.toString()}`} className="font-semibold text-slate-200 hover:text-emerald-300">
                  {t("Đề xuất", "Proposal")} #{d.proposalId.toString()}
                </Link>
                <span className="text-slate-400">
                  → <span className="font-mono">{shortenAddress(d.recipient)}</span>
                </span>
                <span className="font-mono font-bold text-amber-300">{formatEth(d.amount, locale)}</span>
                <span className="text-xs text-slate-400">{formatDateTime(d.timestamp, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateProposalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
        proposalThreshold={config.proposalThreshold}
        votingPeriod={config.votingPeriod}
        treasuryBalance={treasury.balance}
      />
    </>
  );
}
