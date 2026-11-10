"use client";

import React, { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/components/layout/ConnectWalletButton";
import { QuestCard } from "@/components/quests/QuestCard";
import { QuestCelebration } from "@/components/quests/QuestCelebration";
import { QuestSummary } from "@/components/quests/QuestProgress";
import { getChainName } from "@/config/contracts";
import type { QuestDefinition } from "@/data/quests";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useQuestProgress, type QuestWithProgress } from "@/hooks/useQuestProgress";
import { useI18n } from "@/providers/LocaleProvider";

export default function QuestsPage() {
  const { t } = useI18n();
  const { chainId } = useActiveChain();
  const { address: user, isConnected } = useAccount();
  const { address, quests, completedCount, isError, refetch } = useQuestProgress(user);
  const [celebrating, setCelebrating] = useState<QuestDefinition | null>(null);

  const onClaimed = useCallback(
    (quest: QuestWithProgress) => {
      setCelebrating(quest);
      refetch();
    },
    [refetch],
  );
  const closeCelebration = useCallback(() => setCelebrating(null), []);

  const ecoAvailable = quests.reduce((sum, q) => sum + q.ecoReward, 0);
  const ecoEarned = quests
    .filter((q) => q.progress.state === "completed")
    .reduce((sum, q) => sum + q.ecoReward, 0);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-amber-900/50 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 p-6 sm:p-8">
        <span className="inline-flex rounded-full border border-amber-800/80 bg-amber-950/80 px-3 py-1 text-xs font-semibold text-amber-300">
          🎯 Eco Quests · {getChainName(chainId)}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {t("Du lịch tử tế, nhận thưởng xứng đáng", "Travel kindly, earn what you deserve")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          {t(
            "Hoàn thành nhiệm vụ để nhận thêm EcoToken và mở khoá ImpactBadge hiếm. Điều kiện được smart contract kiểm tra on-chain khi bạn nhận thưởng, và mỗi quest chỉ nhận được một lần.",
            "Complete quests to earn extra EcoToken and unlock rare ImpactBadges. The smart contract checks the requirements on-chain when you claim, and each quest can be claimed only once.",
          )}
        </p>
      </section>

      {!address ? (
        <p className="rounded-2xl border border-amber-800/60 bg-amber-950/40 p-4 text-sm text-amber-200">
          {t(
            `Contract QuestRewards chưa được deploy trên ${getChainName(chainId)}, nên chưa thể nhận thưởng quest.`,
            `The QuestRewards contract is not deployed on ${getChainName(chainId)}, so quest rewards cannot be claimed yet.`,
          )}
        </p>
      ) : !isConnected ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-300">{t("Kết nối ví để xem tiến độ và nhận thưởng quest của bạn.", "Connect your wallet to see your progress and claim quest rewards.")}</p>
          <ConnectWalletButton />
        </div>
      ) : (
        <>
          <QuestSummary
            completed={completedCount}
            total={quests.length}
            ecoEarned={ecoEarned}
            ecoAvailable={ecoAvailable}
          />
          {isError && (
            <p className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
              {t(
                "Không tải đủ dữ liệu on-chain (RPC có thể đang quá tải); một số tiến độ có thể chưa chính xác.",
                "Could not load all on-chain data (the RPC may be overloaded); some progress may be inaccurate.",
              )}{" "}
              <button type="button" onClick={refetch} className="font-semibold underline">
                {t("Thử lại", "Try again")}
              </button>
            </p>
          )}
        </>
      )}

      <h2 id="quest-list-title" className="sr-only">
        {t("Danh sách quest", "Quest list")}
      </h2>
      <section aria-labelledby="quest-list-title" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {quests.map((quest) =>
          address && isConnected ? (
            <QuestCard key={quest.id} quest={quest} contract={address} onClaimed={onClaimed} />
          ) : (
            <QuestCard
              key={quest.id}
              quest={{ ...quest, progress: { ...quest.progress, state: "in-progress", current: 0, ratio: 0 } }}
              contract={address ?? "0x0000000000000000000000000000000000000000"}
              onClaimed={onClaimed}
            />
          ),
        )}
      </section>

      {celebrating && <QuestCelebration quest={celebrating} onClose={closeCelebration} />}
    </>
  );
}
