"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ExecuteProposalButton } from "@/components/governance/ExecuteProposalButton";
import { ProposalStatusBadge, VoteBar } from "@/components/governance/ProposalCard";
import { formatEth } from "@/components/governance/TreasuryStats";
import { VoteButtons } from "@/components/governance/VoteButtons";
import { VotingPowerPanel } from "@/components/governance/VotingPowerPanel";
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
      className="font-mono text-emerald-400 hover:underline"
    >
      {shortenAddress(address)} ↗
    </a>
  ) : (
    <span className="font-mono text-slate-200">{shortenAddress(address)}</span>
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
    <Link href="/governance" className="text-sm text-slate-400 hover:text-white">
      {t("← Tất cả đề xuất", "← All proposals")}
    </Link>
  );

  if (id === null || notFound) {
    return (
      <>
        {back}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold text-white">{t("Không tìm thấy đề xuất", "Proposal not found")}</p>
        </div>
      </>
    );
  }

  if (isLoading || !proposal) {
    return (
      <>
        {back}
        {isError ? (
          <p className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
            {t("Không đọc được đề xuất (RPC có thể đang quá tải).", "Could not read the proposal (the RPC may be overloaded).")}{" "}
            <button type="button" onClick={refetch} className="font-semibold underline">
              {t("Thử lại", "Try again")}
            </button>
          </p>
        ) : (
          <div className="h-80 animate-pulse rounded-3xl bg-slate-900" aria-label={t("Đang tải", "Loading")} />
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
        <article className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-slate-400">{t("Đề xuất", "Proposal")} #{proposal.id.toString()}</span>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {displayProposalTitle(proposal.title, locale)}
            </h1>
          </header>

          {proposal.body ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-300 sm:text-base">
              {proposal.body}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">{t("Không có mô tả.", "No description.")}</p>
          )}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">{t("Số ETH yêu cầu", "ETH requested")}</dt>
              <dd className="mt-0.5 font-mono text-lg font-bold text-amber-300">{formatEth(proposal.amount, locale)}</dd>
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">{isOpen ? t("Thời gian còn lại", "Time left") : t("Hạn bỏ phiếu", "Voting deadline")}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-100" aria-live="off">
                {isOpen ? `⏳ ${formatCountdown(secondsLeft, locale)}` : formatDateTime(Number(proposal.deadline), locale)}
              </dd>
              {isOpen && (
                <dd className="text-[11px] text-slate-400">{t("Kết thúc", "Ends")} {formatDateTime(Number(proposal.deadline), locale)}</dd>
              )}
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">{t("Ví nhận", "Recipient wallet")}</dt>
              <dd className="mt-0.5">
                <AddressLink address={proposal.recipient} explorerUrl={explorerUrl} />
              </dd>
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">{t("Người đề xuất", "Proposer")}</dt>
              <dd className="mt-0.5">
                <AddressLink address={proposal.proposer} explorerUrl={explorerUrl} />
              </dd>
            </div>
          </dl>

          <VoteBar proposal={proposal} />
          <p className="text-xs text-slate-400">
            {t(
              `Phiếu tính theo ECO đã kích hoạt quyền vote tại block snapshot #${proposal.snapshotBlock} (block ngay trước khi đề xuất được tạo).`,
              `Votes are counted from ECO with activated voting power at snapshot block #${proposal.snapshotBlock} (the block just before the proposal was created).`,
            )}
          </p>

          {disbursement && (
            <p className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              💸 {t("Quỹ Cộng đồng đã giải ngân", "The Community Treasury disbursed")} {formatEth(disbursement.amount, locale)} {t("cho", "to")}{" "}
              <span className="font-mono">{shortenAddress(disbursement.recipient)}</span> {t("lúc", "at")}{" "}
              {formatDateTime(disbursement.timestamp, locale)}.
            </p>
          )}
          {proposal.status === "pending" && (
            <p className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
              {t(
                `Bỏ phiếu mở sau block #${proposal.snapshotBlock}. Hãy kích hoạt quyền vote trước block này để phiếu của bạn được tính.`,
                `Voting opens after block #${proposal.snapshotBlock}. Activate your voting power before this block for your vote to count.`,
              )}
            </p>
          )}
          {proposal.status === "queued" && (
            <p className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
              {t(
                "Đề xuất đã thông qua và đang trong thời gian chờ an toàn. Có thể giải ngân từ",
                "The proposal passed and is in its safety waiting period. It can be disbursed from",
              )}{" "}
              {new Date(Number(proposal.executeAfter) * 1000).toLocaleString(intlLocale(locale))}.
            </p>
          )}
          {proposal.status === "expired" && (
            <p className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
              {t("Đề xuất đã quá thời hạn giải ngân nên không thể thực thi nữa.", "The proposal's disbursement window has expired, so it can no longer be executed.")}
            </p>
          )}
          {proposal.status === "cancelled" && (
            <p className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">
              {t("Đề xuất đã bị guardian huỷ và không giải ngân.", "The proposal was cancelled by the guardian and will not be disbursed.")}
            </p>
          )}
          {proposal.status === "no-quorum" && (
            <p className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
              {t("Đề xuất không đạt quorum nên không thể thực thi và không giải ngân.", "The proposal did not reach quorum, so it cannot be executed or disbursed.")}
            </p>
          )}
        </article>

        <aside className="space-y-5">
          {(isOpen || hasVoted) && (
            <section aria-labelledby="vote-heading" className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 id="vote-heading" className="font-bold text-white">
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
            <section className="space-y-3 rounded-3xl border border-amber-800/50 bg-amber-950/10 p-5">
              <h2 className="font-bold text-white">{t("Thực thi đề xuất", "Execute proposal")}</h2>
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

          <section aria-labelledby="voters-heading" className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 id="voters-heading" className="font-bold text-white">
              {t("Phiếu bầu", "Votes")} {votes.data ? `(${votes.data.length})` : ""}
            </h2>
            {votes.isLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-slate-800" />
            ) : votes.isError ? (
              <p className="text-sm text-slate-400">{t("Không tải được danh sách phiếu bầu.", "Could not load the vote list.")}</p>
            ) : !votes.data?.length ? (
              <p className="text-sm text-slate-400">{t("Chưa có phiếu bầu nào.", "No votes yet.")}</p>
            ) : (
              <ul className="max-h-80 divide-y divide-slate-800 overflow-y-auto">
                {votes.data.map((v) => (
                  <li key={v.transactionHash} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span aria-label={v.support ? t("Đồng ý", "For") : t("Phản đối", "Against")}>{v.support ? "👍" : "👎"}</span>
                      {explorerUrl ? (
                        <a
                          href={`${explorerUrl}/tx/${v.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-slate-300 hover:text-emerald-300"
                        >
                          {shortenAddress(v.voter)}
                        </a>
                      ) : (
                        <span className="font-mono text-slate-300">{shortenAddress(v.voter)}</span>
                      )}
                      {user && v.voter.toLowerCase() === user.toLowerCase() && (
                        <span className="rounded bg-slate-700 px-1.5 text-[10px] text-slate-200">{t("Bạn", "You")}</span>
                      )}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{formatTokenAmount(v.weight, 18, 2, locale)} ECO</span>
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
