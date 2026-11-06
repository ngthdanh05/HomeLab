"use client";

import React from "react";
import Link from "next/link";
import type { Proposal } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import {
  formatCountdown,
  getVoteBreakdown,
  PROPOSAL_STATUS_INFO,
  type OnChainProposal,
  type ProposalStatus,
} from "@/lib/governance";
import { shortenAddress } from "@/lib/marketplace";
import { formatEth } from "./TreasuryStats";

const TONE_CLASSES = {
  sky: "border-sky-700/60 bg-sky-950/60 text-sky-300",
  emerald: "border-emerald-700/60 bg-emerald-950/60 text-emerald-300",
  amber: "border-amber-700/60 bg-amber-950/60 text-amber-300",
  slate: "border-slate-700 bg-slate-800/80 text-slate-300",
  red: "border-red-800/60 bg-red-950/60 text-red-300",
} as const;

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const info = PROPOSAL_STATUS_INFO[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[info.tone]}`}
    >
      <span aria-hidden>{info.icon}</span>
      {info.label}
    </span>
  );
}

/** For/Against progress bar plus quorum progress. */
export function VoteBar({ proposal }: { proposal: Pick<OnChainProposal, "votesFor" | "votesAgainst" | "quorumVotes"> }) {
  const b = getVoteBreakdown(proposal);
  const pct = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-emerald-300">
          👍 {formatTokenAmount(proposal.votesFor, 18, 2)} ECO ({pct(b.forPct)})
        </span>
        <span className="font-semibold text-red-300">
          👎 {formatTokenAmount(proposal.votesAgainst, 18, 2)} ECO ({pct(b.againstPct)})
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-slate-800"
        role="img"
        aria-label={`Đồng ý ${pct(b.forPct)}, phản đối ${pct(b.againstPct)}`}
      >
        {b.total > 0n && (
          <>
            <div className="bg-emerald-500 transition-[width] duration-500" style={{ width: `${b.forPct}%` }} />
            <div className="bg-red-500 transition-[width] duration-500" style={{ width: `${b.againstPct}%` }} />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full ${b.quorumReached ? "bg-sky-400" : "bg-slate-500"}`}
            style={{ width: `${b.quorumPct}%` }}
          />
        </div>
        <span className="whitespace-nowrap">
          Quorum {b.quorumReached ? "✓ đã đạt" : pct(b.quorumPct)} ({formatTokenAmount(proposal.quorumVotes, 18, 2)}{" "}
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
  const secondsLeft = Number(proposal.deadline) - now;
  const href = `/governance/${proposal.id.toString()}`;

  return (
    <article
      aria-labelledby={`proposal-${proposal.id}-title`}
      className="group flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">#{proposal.id.toString()}</span>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <div className="min-w-0">
        <h2 id={`proposal-${proposal.id}-title`} className="line-clamp-2 text-lg font-bold text-white">
          <Link href={href} className="hover:text-emerald-300 focus:outline-none focus-visible:underline">
            {proposal.title}
          </Link>
        </h2>
        {proposal.body && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{proposal.body}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-800/60 p-2.5">
          <dt className="text-slate-400">Số ETH yêu cầu</dt>
          <dd className="mt-0.5 font-mono text-sm font-bold text-amber-300">{formatEth(proposal.amount)}</dd>
        </div>
        <div className="rounded-xl bg-slate-800/60 p-2.5">
          <dt className="text-slate-400">{proposal.status === "active" ? "Còn lại" : "Hạn bỏ phiếu"}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-200" suppressHydrationWarning>
            {proposal.status === "active"
              ? `⏳ ${formatCountdown(secondsLeft)}`
              : new Date(Number(proposal.deadline) * 1000).toLocaleDateString("vi-VN")}
          </dd>
        </div>
      </dl>

      <VoteBar proposal={proposal} />

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
        <span>
          Nhận: <span className="font-mono text-slate-300">{shortenAddress(proposal.recipient)}</span>
        </span>
        <Link href={href} className="font-semibold text-emerald-400 hover:text-emerald-300">
          {proposal.status === "active" ? "Bỏ phiếu →" : "Chi tiết →"}
        </Link>
      </div>
    </article>
  );
}
