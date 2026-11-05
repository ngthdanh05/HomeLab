"use client";

import React from "react";
import Link from "next/link";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { QuestRewardsABI } from "@/config/contracts";
import { useContractTx } from "@/hooks/useContractTx";
import type { QuestWithProgress } from "@/hooks/useQuestProgress";
import { getBadgeType } from "@/lib/dashboard";
import { formatQuestCount } from "@/lib/quests";
import { QuestProgressBar } from "./QuestProgress";

interface QuestCardProps {
  quest: QuestWithProgress;
  /** QuestRewards on the active chain. */
  contract: Address;
  /** Called once the claim transaction is confirmed. */
  onClaimed: (quest: QuestWithProgress) => void;
}

/** One Eco Quest: rewards, progress and the on-chain claim button. */
export function QuestCard({ quest, contract, onClaimed }: QuestCardProps) {
  const { isConnected } = useAccount();
  const { progress } = quest;
  const { send, status, isBusy } = useContractTx({
    pending: `Đang nhận thưởng "${quest.title}"`,
    success: `Hoàn thành quest "${quest.title}"! 🎉`,
  });

  const completed = progress.state === "completed";
  const ready = progress.state === "ready";
  const badge = quest.rewardBadgeType !== undefined ? getBadgeType(quest.rewardBadgeType) : undefined;

  const claim = async () => {
    const result = await send({
      address: contract,
      abi: QuestRewardsABI,
      functionName: "claim",
      args: [BigInt(quest.id), progress.proofIds],
    });
    if (result?.outcome === "confirmed") onClaimed(quest);
  };

  return (
    <article
      aria-labelledby={`quest-${quest.id}-title`}
      className={`flex flex-col gap-4 rounded-3xl border p-5 transition-colors ${
        completed
          ? "border-emerald-700/60 bg-emerald-950/20"
          : ready
            ? "border-amber-600/60 bg-amber-950/10"
            : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            completed ? "bg-emerald-500/20" : "bg-slate-800"
          }`}
          aria-hidden
        >
          {quest.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`quest-${quest.id}-title`} className="font-bold text-white">
            {quest.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400">{quest.description}</p>
        </div>
        {completed && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-slate-950"
            role="img"
            aria-label="Đã hoàn thành"
          >
            ✓
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {quest.ecoReward > 0 && (
          <span className="rounded-lg bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-300">
            +{quest.ecoReward} ECO
          </span>
        )}
        {badge && (
          <span className="rounded-lg bg-violet-500/15 px-2 py-1 font-semibold text-violet-300">
            {badge.icon} Badge {badge.label}
          </span>
        )}
        {quest.kind === "heritage-views" && (
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-400" title="Hành động off-chain nên không thưởng ECO">
            Theo dõi trên trình duyệt này
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Tiến độ</span>
          <span className="font-mono text-slate-200">
            {progress.state === "loading" && !completed
              ? "…"
              : `${formatQuestCount(quest, progress.current)} / ${formatQuestCount(quest, progress.target)}`}
          </span>
        </div>
        <QuestProgressBar
          ratio={progress.ratio}
          label={`Tiến độ quest ${quest.title}`}
          tone={completed ? "emerald" : ready ? "amber" : "slate"}
        />
      </div>

      <div className="mt-auto">
        {completed ? (
          <p className="rounded-xl bg-emerald-500/10 py-2.5 text-center text-sm font-semibold text-emerald-300">
            Đã nhận thưởng
          </p>
        ) : ready && isConnected ? (
          <button
            type="button"
            onClick={() => void claim()}
            disabled={isBusy || status === "unconfirmed"}
            className="quest-glow flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy && <Spinner />}
            {status === "awaiting-wallet"
              ? "Xác nhận trong ví…"
              : status === "pending"
                ? "Đang nhận thưởng on-chain…"
                : status === "unconfirmed"
                  ? "Đang chờ xác nhận…"
                  : "🎁 Nhận thưởng"}
          </button>
        ) : (
          <Link
            href={quest.action.href}
            className="block rounded-xl border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-300 transition-colors hover:border-emerald-600 hover:text-emerald-300"
          >
            {quest.action.label} →
          </Link>
        )}
      </div>
    </article>
  );
}
