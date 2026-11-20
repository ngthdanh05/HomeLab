"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowLeft, ExternalLink, HandCoins, Hourglass, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import { ExecuteProposalButton } from "@/components/governance/ExecuteProposalButton";
import { ProposalStatusBadge, VoteBar } from "@/components/governance/ProposalCard";
import { formatEth } from "@/components/governance/TreasuryStats";
import { VoteButtons } from "@/components/governance/VoteButtons";
import { VotingPowerPanel } from "@/components/governance/VotingPowerPanel";
import { Alert } from "@/components/ui";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useProposal, useProposalVotes } from "@/hooks/useGovernance";
import { useTreasury } from "@/hooks/useTreasury";
import { formatDateTime, formatTokenAmount } from "@/lib/dashboard";
import { displayProposalTitle, formatCountdown, parseProposalId } from "@/lib/governance";
import { intlLocale } from "@/lib/i18n";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

function AddressLink({ address, explorerUrl }: { address: string; explorerUrl?: string }) {
  return explorerUrl ? (
    <a
      href={`${explorerUrl}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
    >
      {shortenAddress(address)}
      <ExternalLink aria-hidden className="h-4 w-4" />
    </a>
  ) : (
    <span className="font-mono text-text">{shortenAddress(address)}</span>
  );
}

export default function ProposalDetailPage() {
  const { locale, t } = useI18n();
  const params = useParams<{ proposalId: string }>();
  const id = parseProposalId(params?.proposalId);
  const { address: user, isConnected } = useAccount();
  const { explorerUrl } = useActiveChain();
  const { proposal, now, hasVoted, votingPowerAtSnapshot, isLoading, notFound, isError, refetch } = useProposal(
    id,
    user,
  );
  const votes = useProposalVotes(id);
  const treasury = useTreasury();

  const back = (
    <Link href="/governance" className="inline-flex min-h-11 items-center gap-2 text-sm text-text-muted hover:text-text">
      <ArrowLeft aria-hidden className="h-4 w-4" />
      {t("Tất cả đề xuất", "All proposals")}
    </Link>
  );

  if (id === null || notFound) {
    return (
      <>
        {back}
        <div className="rounded-lg border border-border bg-surface p-10 text-center">
          <SearchX aria-hidden className="mx-auto h-10 w-10 text-text-muted" />
          <p className="mt-3 font-semibold text-text">{t("Không tìm thấy đề xuất", "Proposal not found")}</p>
        </div>
      </>
    );
  }

  if (isLoading || !proposal) {
    return (
      <>
        {back}
        {isError ? (
          <Alert tone="danger">
            {t("Không đọc được đề xuất (RPC có thể đang quá tải).", "Could not read the proposal (the RPC may be overloaded).")}{" "}
            <button type="button" onClick={refetch} className="min-h-11 font-semibold underline hover:text-danger">
              {t("Thử lại", "Try again")}
            </button>
          </Alert>
        ) : (
          <div className="h-80 animate-pulse rounded-lg border border-border bg-surface" aria-label={t("Đang tải", "Loading")} />
        )}
      </>
    );
  }

  const secondsLeft = Number(proposal.deadline) - now;
  const isOpen = proposal.status === "active";
  const myVote = user ? votes.data?.find((v) => v.voter.toLowerCase() === user.toLowerCase()) : undefined;
  const disbursement = treasury.disbursements.find((d) => d.proposalId === proposal.id);

  return (
    <>
      {back}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="space-y-6 rounded-lg border border-border bg-surface p-5 sm:p-7">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm tabular-nums text-text-muted">{t("Đề xuất", "Proposal")} #{proposal.id.toString()}</span>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <h1 className="break-words text-2xl font-bold tracking-tight text-text sm:text-3xl">
              {displayProposalTitle(proposal.title, locale)}
            </h1>
          </header>

          {proposal.body ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-text-muted sm:text-base">
              {proposal.body}
            </p>
          ) : (
            <p className="text-sm italic text-text-muted">{t("Không có mô tả.", "No description.")}</p>
          )}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-bg p-3">
              <dt className="text-xs text-text-muted">{t("Số ETH yêu cầu", "ETH requested")}</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-text">{formatEth(proposal.amount, locale)}</dd>
            </div>
            <div className="rounded-md bg-bg p-3">
              <dt className="text-xs text-text-muted">{isOpen ? t("Thời gian còn lại", "Time left") : t("Hạn bỏ phiếu", "Voting deadline")}</dt>
              <dd className="mt-1 flex items-center gap-2 text-lg font-semibold text-text" aria-live="off">
                {isOpen ? (
                  <>
                    <Hourglass aria-hidden className="h-5 w-5 text-text-muted" />
                    {formatCountdown(secondsLeft, locale)}
                  </>
                ) : (
                  formatDateTime(Number(proposal.deadline), locale)
                )}
              </dd>
              {isOpen && (
                <dd className="text-xs text-text-muted">{t("Kết thúc", "Ends")} {formatDateTime(Number(proposal.deadline), locale)}</dd>
              )}
            </div>
            <div className="rounded-md bg-bg p-3">
              <dt className="text-xs text-text-muted">{t("Ví nhận", "Recipient wallet")}</dt>
              <dd className="mt-1">
                <AddressLink address={proposal.recipient} explorerUrl={explorerUrl} />
              </dd>
            </div>
            <div className="rounded-md bg-bg p-3">
              <dt className="text-xs text-text-muted">{t("Người đề xuất", "Proposer")}</dt>
              <dd className="mt-1">
                <AddressLink address={proposal.proposer} explorerUrl={explorerUrl} />
              </dd>
            </div>
          </dl>

          <VoteBar proposal={proposal} />
          <p className="text-xs text-text-muted">
            {t(
              `Phiếu tính theo ECO đã kích hoạt quyền bỏ phiếu tại khối #${proposal.snapshotBlock} (khối chốt số dư khi đề xuất được tạo).`,
              `Votes are counted from ECO with activated voting power at snapshot block #${proposal.snapshotBlock} (the block just before the proposal was created).`,
            )}
          </p>

          {disbursement && (
            <Alert tone="success" icon={HandCoins}>
              {t("Quỹ bảo tồn biển đã giải ngân", "The Ocean Conservation Fund disbursed")} {formatEth(disbursement.amount, locale)} {t("cho", "to")}{" "}
              <span className="font-mono">{shortenAddress(disbursement.recipient)}</span> {t("lúc", "at")}{" "}
              {formatDateTime(disbursement.timestamp, locale)}.
            </Alert>
          )}
          {proposal.status === "pending" && (
            <p className="rounded-md border border-border bg-bg p-3 text-sm text-text-muted">
              {t(
                `Bỏ phiếu mở sau khối #${proposal.snapshotBlock}. Hãy kích hoạt quyền bỏ phiếu trước khối này để phiếu của bạn được tính.`,
                `Voting opens after block #${proposal.snapshotBlock}. Activate your voting power before this block for your vote to count.`,
              )}
            </p>
          )}
          {proposal.status === "queued" && (
            <Alert tone="warning">
              {t(
                "Đề xuất đã thông qua và đang trong thời gian chờ an toàn. Có thể giải ngân từ",
                "The proposal passed and is in its safety waiting period. It can be disbursed from",
              )}{" "}
              {new Date(Number(proposal.executeAfter) * 1000).toLocaleString(intlLocale(locale))}.
            </Alert>
          )}
          {proposal.status === "expired" && (
            <p className="rounded-md border border-border bg-bg p-3 text-sm text-text-muted">
              {t("Đề xuất đã quá thời hạn giải ngân nên không thể thực thi nữa.", "The proposal's disbursement window has expired, so it can no longer be executed.")}
            </p>
          )}
          {proposal.status === "cancelled" && (
            <Alert tone="danger" role="status">
              {t("Đề xuất đã bị người giám sát huỷ và không giải ngân.", "The proposal was cancelled by the guardian and will not be disbursed.")}
            </Alert>
          )}
          {proposal.status === "no-quorum" && (
            <p className="rounded-md border border-border bg-bg p-3 text-sm text-text-muted">
              {t("Đề xuất không đạt số phiếu tối thiểu nên không thể giải ngân.", "The proposal did not reach quorum, so it cannot be executed or disbursed.")}
            </p>
          )}
        </article>

        <aside className="space-y-5">
          {(isOpen || hasVoted) && (
            <section aria-labelledby="vote-heading" className="space-y-3 rounded-lg border border-border bg-surface p-5">
              <h2 id="vote-heading" className="font-bold text-text">
                {t("Bỏ phiếu", "Vote")}
              </h2>
              <VoteButtons
                proposalId={proposal.id}
                isOpen={isOpen}
                hasVoted={hasVoted}
                mySupport={myVote?.support}
                votingPower={votingPowerAtSnapshot}
                onVoted={refetch}
              />
            </section>
          )}

          {(proposal.status === "passed" || proposal.status === "defeated") && (
            <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
              <h2 className="font-bold text-text">{t("Thực thi đề xuất", "Execute proposal")}</h2>
              <ExecuteProposalButton
                proposalId={proposal.id}
                status={proposal.status}
                amount={proposal.amount}
                treasuryBalance={treasury.balance}
                onExecuted={() => {
                  refetch();
                  treasury.refetch();
                }}
              />
            </section>
          )}

          {isConnected && user && (isOpen || proposal.status === "pending") && <VotingPowerPanel user={user} />}

          <section aria-labelledby="voters-heading" className="space-y-3 rounded-lg border border-border bg-surface p-5">
            <h2 id="voters-heading" className="font-bold text-text">
              {t("Phiếu bầu", "Votes")} {votes.data ? `(${votes.data.length})` : ""}
            </h2>
            {votes.isLoading ? (
              <div className="h-16 animate-pulse rounded-md bg-bg" />
            ) : votes.isError ? (
              <p className="text-sm text-text-muted">{t("Không tải được danh sách phiếu bầu.", "Could not load the vote list.")}</p>
            ) : !votes.data?.length ? (
              <p className="text-sm text-text-muted">{t("Chưa có phiếu bầu nào.", "No votes yet.")}</p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {votes.data.map((v) => (
                  <li key={v.transactionHash} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      {v.support ? (
                        <ThumbsUp aria-hidden className="h-4 w-4 text-primary" />
                      ) : (
                        <ThumbsDown aria-hidden className="h-4 w-4 text-danger" />
                      )}
                      <span className="sr-only">{v.support ? t("Đồng ý", "For") : t("Phản đối", "Against")}</span>
                      {explorerUrl ? (
                        <a
                          href={`${explorerUrl}/tx/${v.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-text-muted hover:text-primary"
                        >
                          {shortenAddress(v.voter)}
                        </a>
                      ) : (
                        <span className="font-mono text-text-muted">{shortenAddress(v.voter)}</span>
                      )}
                      {user && v.voter.toLowerCase() === user.toLowerCase() && (
                        <span className="rounded-sm bg-primary-soft px-2 text-xs font-medium text-primary">{t("Bạn", "You")}</span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-text-muted">{formatTokenAmount(v.weight, 18, 2, locale)} ECO</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
