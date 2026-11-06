"use client";

import React from "react";
import { formatTokenAmount } from "@/lib/dashboard";
import { formatBpsPercent, formatDuration } from "@/lib/governance";
import { shortenAddress } from "@/lib/marketplace";

interface TreasuryStatsProps {
  balance: bigint | undefined;
  totalDisbursed: bigint | undefined;
  disbursementCount: number | undefined;
  activeCount: number | undefined;
  totalProposals: bigint | undefined;
  proposalThreshold: bigint | undefined;
  quorumBps: bigint | undefined;
  votingPeriod: bigint | undefined;
  treasuryAddress: string;
  explorerUrl?: string;
}

function formatEth(value: bigint | undefined): string {
  if (value === undefined) return "—";
  return `${formatTokenAmount(value, 18, 6)} ETH`;
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-1 break-words font-mono text-xl font-bold sm:text-2xl ${accent}`} aria-live="polite">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** Community Treasury balance, total disbursed, active proposals and DAO parameters. */
export function TreasuryStats(props: TreasuryStatsProps) {
  const { balance, totalDisbursed, disbursementCount, activeCount, totalProposals } = props;

  return (
    <section aria-label="Thống kê Quỹ Cộng đồng" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="💰 Số dư Quỹ Cộng đồng"
          value={formatEth(balance)}
          hint="20% doanh thu D2C + phí bù đắp carbon"
          accent="text-emerald-300"
        />
        <Stat
          label="💸 Đã giải ngân"
          value={formatEth(totalDisbursed)}
          hint={disbursementCount !== undefined ? `${disbursementCount} lần giải ngân` : undefined}
          accent="text-amber-300"
        />
        <Stat
          label="🗳️ Đề xuất đang bỏ phiếu"
          value={activeCount === undefined ? "—" : String(activeCount)}
          hint={totalProposals !== undefined ? `Tổng ${totalProposals.toString()} đề xuất` : undefined}
          accent="text-sky-300"
        />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex gap-1">
          <dt>Ngưỡng tạo đề xuất:</dt>
          <dd className="font-semibold text-slate-200">
            {props.proposalThreshold !== undefined ? `${formatTokenAmount(props.proposalThreshold)} ECO` : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Quorum:</dt>
          <dd className="font-semibold text-slate-200">
            {props.quorumBps !== undefined ? `${formatBpsPercent(props.quorumBps)} tổng cung ECO` : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Thời gian bỏ phiếu:</dt>
          <dd className="font-semibold text-slate-200">
            {props.votingPeriod !== undefined ? formatDuration(Number(props.votingPeriod)) : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Contract Quỹ:</dt>
          <dd>
            {props.explorerUrl ? (
              <a
                href={`${props.explorerUrl}/address/${props.treasuryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-emerald-400 hover:underline"
              >
                {shortenAddress(props.treasuryAddress)} ↗
              </a>
            ) : (
              <span className="font-mono text-slate-300">{shortenAddress(props.treasuryAddress)}</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export { formatEth };
