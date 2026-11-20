"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Hourglass, ThumbsDown, ThumbsUp } from "lucide-react";
import { AppIcon } from "@/components/ui";
import type { Proposal } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import {
  displayProposalTitle,
  formatCountdown,
  getVoteBreakdown,
  PROPOSAL_STATUS_INFO,
  type OnChainProposal,
  type ProposalStatus,
} from "@/lib/governance";
import { intlLocale } from "@/lib/i18n";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";
import { formatEth } from "./TreasuryStats";

const TONE_CLASSES = {
  info: "border-info/30 bg-info-soft text-info",
  success: "border-primary/30 bg-primary-soft text-primary",
  warning: "border-warning/30 bg-warning-soft text-warning",
  neutral: "border-border bg-bg text-text-muted",
  danger: "border-danger/30 bg-danger-soft text-danger",
} as const;

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const { t } = useI18n();
  const info = PROPOSAL_STATUS_INFO[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASSES[info.tone]}`}
    >
      <AppIcon name={info.icon} className="h-4 w-4" />
      {t(info.label, info.labelEn)}
    </span>
  );
}

/** For/Against progress bar plus quorum progress. */
export function VoteBar({ proposal }: { proposal: Pick<OnChainProposal, "votesFor" | "votesAgainst" | "quorumVotes"> }) {
  const { locale, t } = useI18n();
  const b = getVoteBreakdown(proposal);
  const pct = (value: number) => `${value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })}%`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-primary">
          <ThumbsUp aria-hidden className="h-4 w-4" />
          {formatTokenAmount(proposal.votesFor, 18, 2, locale)} ECO ({pct(b.forPct)})
        </span>
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-danger">
          <ThumbsDown aria-hidden className="h-4 w-4" />
          {formatTokenAmount(proposal.votesAgainst, 18, 2, locale)} ECO ({pct(b.againstPct)})
        </span>
      </div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-bg"
        role="img"
        aria-label={t(`Đồng ý ${pct(b.forPct)}, phản đối ${pct(b.againstPct)}`, `For ${pct(b.forPct)}, against ${pct(b.againstPct)}`)}
      >
        {b.total > 0n && (
          <>
            <div className="bg-primary transition-[width] duration-500" style={{ width: `${b.forPct}%` }} />
            <div className="bg-danger transition-[width] duration-500" style={{ width: `${b.againstPct}%` }} />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg">
          <div
            className={`h-full ${b.quorumReached ? "bg-info" : "bg-border-strong"}`}
            style={{ width: `${b.quorumPct}%` }}
          />
        </div>
        <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
          {t("Số phiếu tối thiểu", "Quorum")}{" "}
          {b.quorumReached ? (
            <>
              <Check aria-hidden className="h-4 w-4 text-info" />
              {t("đã đạt", "reached")}
            </>
          ) : (
            pct(b.quorumPct)
          )}{" "}
          ({formatTokenAmount(proposal.quorumVotes, 18, 2, locale)}{" "}
          ECO)
        </span>
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  now: number;
}

/** Summary of one DAO proposal in the list; links to its detail page. */
export function ProposalCard({ proposal, now }: ProposalCardProps) {
  const { locale, t } = useI18n();
  const secondsLeft = Number(proposal.deadline) - now;
  const href = `/governance/${proposal.id.toString()}`;

  return (
    <article
      aria-labelledby={`proposal-${proposal.id}-title`}
      className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-text-muted">#{proposal.id.toString()}</span>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <div className="min-w-0">
        <h2 id={`proposal-${proposal.id}-title`} className="line-clamp-2 text-lg font-bold text-text">
          <Link href={href} className="hover:text-primary focus:outline-none focus-visible:underline">
            {displayProposalTitle(proposal.title, locale)}
          </Link>
        </h2>
        {proposal.body && <p className="mt-1 line-clamp-2 text-sm text-text-muted">{proposal.body}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md bg-bg p-3">
          <dt className="text-text-muted">{t("Số ETH yêu cầu", "ETH requested")}</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-text">{formatEth(proposal.amount, locale)}</dd>
        </div>
        <div className="rounded-md bg-bg p-3">
          <dt className="text-text-muted">{proposal.status === "active" ? t("Còn lại", "Time left") : t("Hạn bỏ phiếu", "Voting deadline")}</dt>
          <dd className="mt-1 flex items-center gap-1 text-sm font-semibold text-text" suppressHydrationWarning>
            {proposal.status === "active" ? (
              <>
                <Hourglass aria-hidden className="h-4 w-4 text-text-muted" />
                {formatCountdown(secondsLeft, locale)}
              </>
            ) : (
              new Date(Number(proposal.deadline) * 1000).toLocaleDateString(intlLocale(locale))
            )}
          </dd>
        </div>
      </dl>

      <VoteBar proposal={proposal} />

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-text-muted">
        <span>
          {t("Nhận:", "Recipient:")} <span className="font-mono text-text-muted">{shortenAddress(proposal.recipient)}</span>
        </span>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:text-primary-hover hover:underline"
        >
          {proposal.status === "active" ? t("Bỏ phiếu", "Vote") : t("Chi tiết", "Details")}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
