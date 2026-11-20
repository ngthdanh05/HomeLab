"use client";

import React from "react";
import type { Address } from "viem";
import { ArrowRight, Check, Gift, Sparkles } from "lucide-react";
import { AppIcon, ButtonLink, cn, TxButton } from "@/components/ui";
import { QuestRewardsABI } from "@/config/contracts";
import { useContractTx } from "@/hooks/useContractTx";
import type { QuestWithProgress } from "@/hooks/useQuestProgress";
import { localizeQuest } from "@/data/quests";
import { getBadgeType } from "@/lib/dashboard";
import { formatQuestCount } from "@/lib/quests";
import { useI18n } from "@/providers/LocaleProvider";
import { QuestProgressBar } from "./QuestProgress";

interface QuestCardProps {
  quest: QuestWithProgress;
  /** QuestRewards trên mạng đang dùng; undefined ⇒ chưa deploy, không nhận thưởng được. */
  contract: Address | undefined;
  /** Ví đã kết nối: mới hiện tiến độ thật và nút nhận thưởng. */
  connected: boolean;
  /** Gọi khi giao dịch nhận thưởng đã được xác nhận. */
  onClaimed: (quest: QuestWithProgress) => void;
  /** Thẻ "Nhiệm vụ tiếp theo": lớn hơn, viền nhấn. */
  featured?: boolean;
}

/** Một nhiệm vụ bảo tồn: phần thưởng, tiến độ và nút nhận thưởng on-chain. */
export function QuestCard({ quest: rawQuest, contract, connected, onClaimed, featured = false }: QuestCardProps) {
  const { locale, t } = useI18n();
  const quest = localizeQuest(rawQuest, locale);
  const progress = connected ? quest.progress : { ...quest.progress, state: "in-progress" as const, current: 0, ratio: 0 };
  const { send, status } = useContractTx({
    pending: t(`Đang nhận thưởng "${quest.title}"`, `Claiming "${quest.title}"`),
    success: t(`Hoàn thành nhiệm vụ "${quest.title}"!`, `Quest "${quest.title}" completed!`),
  });

  const completed = progress.state === "completed";
  const ready = progress.state === "ready" && Boolean(contract);
  const badge = quest.rewardBadgeType !== undefined ? getBadgeType(quest.rewardBadgeType) : undefined;
  const titleId = `quest-${quest.id}-title${featured ? "-next" : ""}`;

  const claim = async () => {
    if (!contract) return;
    const result = await send({
      address: contract,
      abi: QuestRewardsABI,
      functionName: "claim",
      args: [BigInt(quest.id), progress.proofIds],
    });
    if (result?.outcome === "confirmed") onClaimed(rawQuest);
  };

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col gap-4 rounded-lg border bg-surface p-6",
        featured ? "border-2 border-primary" : completed ? "border-primary/30" : ready ? "border-accent" : "border-border",
      )}
    >
      {featured && (
        <p className="inline-flex items-center gap-2 self-start rounded-sm bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
          <Sparkles aria-hidden className="h-4 w-4" />
          {ready ? t("Sẵn sàng nhận thưởng", "Ready to claim") : t("Nhiệm vụ tiếp theo", "Next quest")}
        </p>
      )}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md",
            featured ? "h-14 w-14" : "h-12 w-12",
            completed ? "bg-primary-soft text-primary" : ready ? "bg-accent-soft text-accent-strong" : "bg-bg text-primary",
          )}
        >
          <AppIcon name={quest.icon} className={featured ? "h-7 w-7" : "h-6 w-6"} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className={cn("font-semibold text-text", featured ? "text-xl" : "text-lg")}>
            {quest.title}
          </h3>
          <p className="mt-1 text-sm text-text-muted">{quest.description}</p>
        </div>
        {completed && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white" role="img" aria-label={t("Đã hoàn thành", "Completed")}>
            <Check aria-hidden className="h-5 w-5" />
          </span>
        )}
      </div>

      <ul className="flex flex-wrap gap-2 text-xs" aria-label={t("Phần thưởng", "Rewards")}>
        {quest.ecoReward > 0 && <li className="rounded-sm bg-accent-soft px-2 py-1 font-semibold tabular-nums text-accent-strong">+{quest.ecoReward} ECO</li>}
        {badge && (
          <li className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-1 font-semibold text-accent-strong">
            <AppIcon name={badge.icon} className="h-4 w-4" />
            {t(`Huy hiệu ${badge.label}`, `${badge.labelEn} badge`)}
          </li>
        )}
        {quest.kind === "heritage-views" && (
          <li className="rounded-sm bg-bg px-2 py-1 font-medium text-text-muted">{t("Theo dõi trên trình duyệt này", "Tracked in this browser")}</li>
        )}
      </ul>

      {connected && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-text-muted">
            <span>{t("Tiến độ", "Progress")}</span>
            <span className="tabular-nums text-text">
              {progress.state === "loading"
                ? "…"
                : `${formatQuestCount(quest, progress.current, locale)} / ${formatQuestCount(quest, progress.target, locale)}`}
            </span>
          </div>
          <QuestProgressBar
            ratio={progress.ratio}
            label={t(`Tiến độ nhiệm vụ ${quest.title}`, `Progress of quest ${quest.title}`)}
            tone={completed ? "primary" : ready ? "accent" : "neutral"}
          />
        </div>
      )}

      <div className="mt-auto">
        {completed ? (
          <p className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-soft text-sm font-semibold text-primary">
            <Check aria-hidden className="h-4 w-4" />
            {t("Đã nhận thưởng", "Reward claimed")}
          </p>
        ) : ready ? (
          <TxButton
            fullWidth
            variant={featured ? "primary" : "secondary"}
            size={featured ? "lg" : "md"}
            icon={Gift}
            status={status}
            disabled={status === "unconfirmed"}
            onClick={claim}
            busyLabels={{ pending: t("Đang nhận thưởng…", "Claiming on-chain…") }}
          >
            {status === "unconfirmed" ? t("Đang chờ xác nhận…", "Waiting for confirmation…") : t("Nhận thưởng", "Claim reward")}
          </TxButton>
        ) : (
          <ButtonLink href={quest.action.href} variant={featured ? "primary" : "secondary"} size={featured ? "lg" : "md"} fullWidth iconRight={ArrowRight}>
            {quest.action.label}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
