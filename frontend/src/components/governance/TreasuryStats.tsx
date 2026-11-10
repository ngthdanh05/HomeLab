"use client";

import React from "react";
import { formatTokenAmount } from "@/lib/dashboard";
import { formatBpsPercent, formatDuration } from "@/lib/governance";
import type { Locale } from "@/lib/i18n";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

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

function formatEth(value: bigint | undefined, locale: Locale = "vi"): string {
  if (value === undefined) return "—";
  return `${formatTokenAmount(value, 18, 6, locale)} ETH`;
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
  const { locale, t } = useI18n();
  const { balance, totalDisbursed, disbursementCount, activeCount, totalProposals } = props;

  return (
    <section aria-label={t("Thống kê Quỹ Cộng đồng", "Community Treasury statistics")} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label={t("💰 Số dư Quỹ Cộng đồng", "💰 Community Treasury balance")}
          value={formatEth(balance, locale)}
          hint={t("20% doanh thu D2C + phí bù đắp carbon", "20% of D2C revenue + carbon offset fees")}
          accent="text-emerald-300"
        />
        <Stat
          label={t("💸 Đã giải ngân", "💸 Disbursed")}
          value={formatEth(totalDisbursed, locale)}
          hint={disbursementCount !== undefined ? t(`${disbursementCount} lần giải ngân`, `${disbursementCount} disbursement${disbursementCount === 1 ? "" : "s"}`) : undefined}
          accent="text-amber-300"
        />
        <Stat
          label={t("🗳️ Đề xuất đang bỏ phiếu", "🗳️ Proposals in voting")}
          value={activeCount === undefined ? "—" : String(activeCount)}
          hint={totalProposals !== undefined ? t(`Tổng ${totalProposals} đề xuất`, `${totalProposals} proposal${totalProposals === 1n ? "" : "s"} in total`) : undefined}
          accent="text-sky-300"
        />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex gap-1">
          <dt>{t("Ngưỡng tạo đề xuất:", "Proposal threshold:")}</dt>
          <dd className="font-semibold text-slate-200">
            {props.proposalThreshold !== undefined ? `${formatTokenAmount(props.proposalThreshold, 18, 4, locale)} ECO` : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Quorum:</dt>
          <dd className="font-semibold text-slate-200">
            {props.quorumBps !== undefined ? `${formatBpsPercent(props.quorumBps, locale)} ${t("tổng cung ECO", "of total ECO supply")}` : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{t("Thời gian bỏ phiếu:", "Voting period:")}</dt>
          <dd className="font-semibold text-slate-200">
            {props.votingPeriod !== undefined ? formatDuration(Number(props.votingPeriod), locale) : "—"}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{t("Contract Quỹ:", "Treasury contract:")}</dt>
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
