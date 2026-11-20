"use client";

import React, { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowRight, HandCoins, Lightbulb, Plus, Waves } from "lucide-react";
import { CreateProposalModal } from "@/components/governance/CreateProposalModal";
import { ParticipationSteps } from "@/components/governance/ParticipationSteps";
import { ProposalCard } from "@/components/governance/ProposalCard";
import { formatEth, TreasuryStats, VotingRules } from "@/components/governance/TreasuryStats";
import { Address, Alert, Button, Card, CardDescription, CardTitle, EmptyState, FilterChips, LoadingRegion, PageHeader, Skeleton } from "@/components/ui";
import { localizeTemplate, PROPOSAL_TEMPLATES, type ProposalTemplate } from "@/data/proposalTemplates";
import { useChainNow, useProposals, useVotingPower } from "@/hooks/useGovernance";
import { useTreasury } from "@/hooks/useTreasury";
import { formatDateTime, formatTokenAmount } from "@/lib/dashboard";
import { PROPOSALS_PAGE_SIZE, type ProposalStatus } from "@/lib/governance";
import { useI18n } from "@/providers/LocaleProvider";

type FilterKey = "all" | "active" | "pending" | "closed";

const FILTERS: { key: FilterKey; label: string; labelEn: string; statuses: ProposalStatus[] | null }[] = [
  { key: "all", label: "Tất cả", labelEn: "All", statuses: null },
  { key: "active", label: "Đang bỏ phiếu", labelEn: "Voting", statuses: ["pending", "active"] },
  // Gồm cả đề xuất bị bác chưa được chốt: nhãn nói về việc chốt kết quả, không phải "chờ thực thi".
  { key: "pending", label: "Chờ chốt kết quả", labelEn: "Awaiting final result", statuses: ["queued", "passed", "defeated"] },
  { key: "closed", label: "Đã kết thúc", labelEn: "Closed", statuses: ["executed", "rejected", "no-quorum", "expired", "cancelled"] },
];

export default function GovernancePage() {
  const { locale, t } = useI18n();
  const hintId = useId();
  const { address: user } = useAccount();
  const [limit, setLimit] = useState(PROPOSALS_PAGE_SIZE);
  const { config, proposals, hasMore, isLoading, isError, refetch } = useProposals(limit);
  const treasury = useTreasury();
  const { balance } = useVotingPower(user);
  const now = useChainNow();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);

  const threshold = config.proposalThreshold;
  const canPropose = Boolean(user) && balance !== undefined && threshold !== undefined && balance >= threshold;
  const fmtEco = (v: bigint | undefined) => (v !== undefined ? `${formatTokenAmount(v, 18, 2, locale)} ECO` : "—");

  const activeCount = config.proposalCount === undefined ? undefined : proposals.filter((p) => p.status === "active").length;
  const visible = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    return statuses ? proposals.filter((p) => statuses.includes(p.status)) : proposals;
  }, [proposals, filter]);

  const openCreate = (tpl: ProposalTemplate | null = null) => {
    setTemplate(tpl);
    setModalOpen(true);
  };
  const showActive = () => {
    setFilter("active");
    document.getElementById("proposals-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const createAction = (
    <div className="flex max-w-xs flex-col gap-2 sm:items-end sm:text-right">
      <Button
        variant={canPropose ? "primary" : "secondary"}
        icon={Plus}
        disabled={!canPropose}
        aria-describedby={canPropose ? undefined : hintId}
        onClick={() => openCreate()}
      >
        {t("Tạo đề xuất", "Create proposal")}
      </Button>
      {!canPropose && (
        <p id={hintId} className="text-sm text-text-muted">
          {!user ? (
            t(`Kết nối ví để tạo đề xuất (cần ${fmtEco(threshold)}).`, `Connect your wallet to create a proposal (needs ${fmtEco(threshold)}).`)
          ) : (
            <>
              {t(`Cần ${fmtEco(threshold)} để tạo đề xuất · bạn có ${fmtEco(balance)}.`, `You need ${fmtEco(threshold)} to propose · you have ${fmtEco(balance)}.`)}{" "}
              <Link href="/quests" className="font-semibold text-primary underline">
                {t("Cách kiếm thêm ECO", "How to earn more ECO")}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={t("Quỹ bảo tồn biển", "Ocean Conservation Fund")}
        icon={Waves}
        title={t("Cộng đồng chọn dự án giữ biển xanh", "The community picks projects that keep the sea blue")}
        description={t(
          "20% mỗi đơn hàng ở Chợ làng chài và toàn bộ phí bù carbon vào Quỹ. Người có ECO bỏ phiếu chọn dự án phục hồi san hô, làm sạch đại dương; dự án được thông qua sẽ được giải ngân tự động.",
          "20% of every Village Market order and all carbon offset fees go into the Fund. ECO holders vote on coral restoration and ocean clean-up projects; approved projects are paid out automatically.",
        )}
        actions={createAction}
      />

      <TreasuryStats
        balance={treasury.balance}
        totalDisbursed={treasury.totalDisbursed}
        disbursementCount={treasury.disbursementCount}
        activeCount={activeCount}
        totalProposals={config.proposalCount}
      />

      <ParticipationSteps onShowActive={showActive} />

      <section aria-labelledby="proposals-heading" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="proposals-heading" className="text-2xl font-semibold text-text">
            {t("Dự án bảo tồn biển", "Ocean conservation projects")}
          </h2>
          <FilterChips
            items={FILTERS.map((f) => ({ id: f.key, label: t(f.label, f.labelEn) }))}
            value={filter}
            onChange={setFilter}
            label={t("Lọc đề xuất", "Filter proposals")}
          />
        </div>

        {isError && (
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" onClick={refetch}>
                {t("Thử lại", "Try again")}
              </Button>
            }
          >
            {t("Không đọc được dữ liệu Quỹ bảo tồn biển (máy chủ có thể đang quá tải).", "Could not read Fund data (the RPC may be overloaded).")}
          </Alert>
        )}

        {isLoading ? (
          <LoadingRegion label={t("Đang tải đề xuất", "Loading proposals")} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </LoadingRegion>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Waves}
            title={proposals.length === 0 ? t("Chưa có đề xuất nào", "No proposals yet") : t("Không có đề xuất nào ở mục này", "No proposals in this category")}
            description={
              proposals.length === 0
                ? t("Hãy là người đầu tiên đề xuất một dự án cho biển. Xem vài ý tưởng bên dưới.", "Be the first to propose a project for the sea. See some ideas below.")
                : t("Thử một mục lọc khác.", "Try another filter.")
            }
            action={
              proposals.length > 0 && (
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  {t("Xem tất cả", "Show all")}
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => (
              <ProposalCard key={p.id.toString()} proposal={p} now={now} />
            ))}
          </div>
        )}
        {hasMore && !isError && (
          <div className="text-center">
            <Button variant="secondary" onClick={() => setLimit((n) => n + PROPOSALS_PAGE_SIZE)}>
              {t("Xem thêm đề xuất", "Show more proposals")}
            </Button>
          </div>
        )}
      </section>

      {!isLoading && proposals.length === 0 && (
        <section aria-labelledby="ideas-heading" className="space-y-4">
          <h2 id="ideas-heading" className="flex items-center gap-2 text-xl font-semibold text-text">
            <Lightbulb aria-hidden className="h-5 w-5 text-accent-strong" />
            {t("Ý tưởng dự án", "Project ideas")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {PROPOSAL_TEMPLATES.map((tpl) => {
              const filled = localizeTemplate(tpl, locale);
              return (
                <Card as="li" key={tpl.key} padding="md" className="flex flex-col gap-3">
                  <CardTitle>{filled.title}</CardTitle>
                  <CardDescription className="flex-1">{filled.body}</CardDescription>
                  <Button variant="ghost" iconRight={ArrowRight} disabled={!canPropose} onClick={() => openCreate(tpl)} className="-ml-4 self-start">
                    {t("Dùng mẫu này", "Use this example")}
                  </Button>
                </Card>
              );
            })}
          </ul>
        </section>
      )}

      <VotingRules
        proposalThreshold={config.proposalThreshold}
        quorumBps={config.quorumBps}
        votingPeriod={config.votingPeriod}
        treasuryAddress={treasury.address}
      />

      {treasury.disbursements.length > 0 && (
        <section aria-labelledby="disbursements-heading" className="space-y-3">
          <h2 id="disbursements-heading" className="flex items-center gap-2 text-xl font-semibold text-text">
            <HandCoins aria-hidden className="h-5 w-5 text-primary" />
            {t("Lịch sử giải ngân", "Disbursement history")}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {treasury.disbursements.map((d) => (
              <li key={d.index} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <Link href={`/governance/${d.proposalId.toString()}`} className="inline-flex min-h-11 items-center font-semibold text-text hover:text-primary">
                  {t("Đề xuất", "Proposal")} #{d.proposalId.toString()}
                </Link>
                <span className="inline-flex items-center gap-2 text-text-muted">
                  {t("tới", "to")} <Address value={d.recipient} />
                </span>
                <span className="font-semibold tabular-nums text-text">{formatEth(d.amount, locale)}</span>
                <span className="text-xs font-medium text-text-muted">{formatDateTime(d.timestamp, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateProposalModal
        key={template?.key ?? "blank"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
        proposalThreshold={config.proposalThreshold}
        votingPeriod={config.votingPeriod}
        treasuryBalance={treasury.balance}
        template={template}
      />
    </>
  );
}
