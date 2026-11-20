"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Target, Wallet } from "lucide-react";
import { QuestCard } from "@/components/quests/QuestCard";
import { QuestCelebration } from "@/components/quests/QuestCelebration";
import { QuestSummary } from "@/components/quests/QuestProgress";
import { Alert, Button, PageHeader } from "@/components/ui";
import { getChainName } from "@/config/contracts";
import { JOURNEY_STAGES, sortByJourney, type QuestDefinition } from "@/data/quests";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useQuestProgress, type QuestWithProgress } from "@/hooks/useQuestProgress";
import { pickNextQuest } from "@/lib/quests";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";

export default function QuestsPage() {
  const { t } = useI18n();
  const { chainId } = useActiveChain();
  const { address: user, isConnected } = useAccount();
  const { open: openWalletModal, prefetch } = useWalletModal();
  const { address: contract, quests, completedCount, isError, refetch } = useQuestProgress(user);
  const [celebrating, setCelebrating] = useState<QuestDefinition | null>(null);
  const connected = Boolean(isConnected && user);

  const onClaimed = useCallback(
    (quest: QuestWithProgress) => {
      setCelebrating(quest);
      refetch();
    },
    [refetch],
  );
  const closeCelebration = useCallback(() => setCelebrating(null), []);

  const journey = useMemo(() => sortByJourney(quests), [quests]);
  // Chưa kết nối ví: gợi ý bước đầu tiên của hành trình.
  const next = connected ? pickNextQuest(journey) : journey[0];

  const ecoAvailable = quests.reduce((sum, q) => sum + q.ecoReward, 0);
  const ecoEarned = quests.filter((q) => q.progress.state === "completed").reduce((sum, q) => sum + q.ecoReward, 0);

  return (
    <>
      <PageHeader
        eyebrow={t("Nhiệm vụ bảo tồn", "Conservation Quests")}
        icon={Target}
        title={t("Mỗi chuyến đi biển, một việc tốt cho đại dương", "Every sea trip, one good deed for the ocean")}
        description={
          <>
            {t(
              "Hoàn thành nhiệm vụ để nhận ECO và Huy hiệu Người giữ biển. ECO là lá phiếu của bạn khi cộng đồng chọn dự án phục hồi san hô và làm sạch đại dương trong",
              "Complete quests to earn ECO and Ocean Keeper badges. ECO is your vote when the community picks coral restoration and ocean clean-up projects in the",
            )}{" "}
            <Link href="/governance" className="font-semibold text-primary underline hover:text-primary-hover">
              {t("Quỹ bảo tồn biển", "Ocean Conservation Fund")}
            </Link>
            .
          </>
        }
      />

      {!contract ? (
        <Alert tone="warning">
          {t(
            `Hợp đồng nhiệm vụ chưa có trên ${getChainName(chainId)}, nên chưa thể nhận thưởng nhiệm vụ.`,
            `The quest contract is not deployed on ${getChainName(chainId)}, so quest rewards cannot be claimed yet.`,
          )}
        </Alert>
      ) : !connected ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Wallet aria-hidden className="h-4 w-4 shrink-0 text-primary" />
            {t("Kết nối ví để xem tiến độ và nhận thưởng.", "Connect your wallet to see your progress and claim rewards.")}
          </p>
          <Button variant="ghost" onClick={openWalletModal} onPointerEnter={prefetch} onFocus={prefetch} className="self-start sm:self-auto">
            {t("Kết nối ví", "Connect wallet")}
          </Button>
        </div>
      ) : (
        <>
          <QuestSummary completed={completedCount} total={quests.length} ecoEarned={ecoEarned} ecoAvailable={ecoAvailable} />
          {isError && (
            <Alert
              tone="danger"
              action={
                <Button variant="secondary" onClick={refetch}>
                  {t("Thử lại", "Try again")}
                </Button>
              }
            >
              {t(
                "Không tải đủ dữ liệu từ mạng (máy chủ có thể đang quá tải); một số tiến độ có thể chưa chính xác.",
                "Could not load all on-chain data (the RPC may be overloaded); some progress may be inaccurate.",
              )}
            </Alert>
          )}
        </>
      )}

      {next && (
        <section aria-labelledby="next-quest-title" className="space-y-3">
          <h2 id="next-quest-title" className="text-2xl font-semibold text-text">
            {t("Nhiệm vụ tiếp theo", "Your next quest")}
          </h2>
          <div className="max-w-2xl">
            <QuestCard quest={next} contract={contract} connected={connected} onClaimed={onClaimed} featured />
          </div>
        </section>
      )}
      {connected && !next && quests.length > 0 && (
        <Alert tone="success" title={t("Bạn đã hoàn thành mọi nhiệm vụ!", "You have completed every quest!")}>
          {t("Cảm ơn bạn đã chung tay giữ biển xanh.", "Thank you for helping keep the ocean blue.")}
        </Alert>
      )}

      <section aria-labelledby="quest-journey-title" className="space-y-8">
        <h2 id="quest-journey-title" className="text-2xl font-semibold text-text">
          {t("Hành trình của du khách biển", "The sea traveller's journey")}
        </h2>
        <ol className="space-y-8">
          {JOURNEY_STAGES.map((stage, index) => {
            const stageQuests = journey.filter((q) => (stage.questKeys as readonly string[]).includes(q.key));
            if (stageQuests.length === 0) return null;
            return (
              <li key={stage.key} className="space-y-4">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-text">
                  <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm tabular-nums text-primary">
                    {index + 1}
                  </span>
                  {t(stage.label, stage.labelEn)}
                </h3>
                <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {stageQuests.map((quest) => (
                    <li key={quest.id}>
                      <QuestCard quest={quest} contract={contract} connected={connected} onClaimed={onClaimed} />
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      {celebrating && <QuestCelebration quest={celebrating} onClose={closeCelebration} />}
    </>
  );
}
