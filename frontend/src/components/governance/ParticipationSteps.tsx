"use client";

import React from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { ArrowRight, Check, Coins, Vote, Zap, type LucideIcon } from "lucide-react";
import { Button, ButtonLink, cn, TxButton } from "@/components/ui";
import { EcoTokenABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useVotingPower } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

type StepStatus = "done" | "todo" | "unknown";

function Step({
  index,
  icon: Icon,
  title,
  status,
  children,
  action,
}: {
  index: number;
  icon: LucideIcon;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <li className={cn("flex flex-col gap-3 rounded-lg border bg-surface p-6", status === "done" ? "border-primary/30" : "border-border")}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            status === "done" ? "bg-primary text-white" : "bg-primary-soft text-primary",
          )}
        >
          {status === "done" ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <h3 className="text-lg font-semibold text-text">
          <span className="text-text-muted">{index}. </span>
          {title}
          {status === "done" && <span className="sr-only"> ({t("đã xong", "done")})</span>}
        </h3>
      </div>
      <div className="flex-1 text-sm text-text-muted">{children}</div>
      {action && <div>{action}</div>}
    </li>
  );
}

/**
 * "Tham gia trong 3 bước": Nhận ECO → Kích hoạt quyền bỏ phiếu → Bỏ phiếu.
 * Hiện cả khi chưa kết nối ví để người dùng biết phải kích hoạt **trước** khi đề xuất được tạo.
 */
export function ParticipationSteps({ onShowActive }: { onShowActive: () => void }) {
  const { locale, t } = useI18n();
  const { addresses } = useActiveChain();
  const { address: user } = useAccount();
  const { balance, votes, delegatee, state, refetch } = useVotingPower(user);
  const { send, status } = useContractTx({
    pending: t("Đang kích hoạt quyền biểu quyết", "Activating voting power"),
    success: t("Đã kích hoạt quyền biểu quyết!", "Voting power activated!"),
  });

  const activate = async () => {
    if (!user) return;
    const result = await send({ address: addresses.ecoToken, abi: EcoTokenABI, functionName: "delegate", args: [user as Address] });
    if (result) void refetch();
  };

  const eco = (value: bigint | undefined) => (value !== undefined ? `${formatTokenAmount(value, 18, 2, locale)} ECO` : "—");
  const hasEco = balance !== undefined && balance > 0n;
  const step1: StepStatus = !user || balance === undefined ? "unknown" : hasEco ? "done" : "todo";
  // Đã tự uỷ quyền thì ECO nhận sau này cũng tự thành phiếu, kể cả khi hiện có 0 ECO.
  const delegatedToSelf = Boolean(user) && delegatee?.toLowerCase() === user?.toLowerCase();
  const step2: StepStatus = !user || state === undefined ? "unknown" : delegatedToSelf ? "done" : "todo";
  const needsDelegate = !user || (state !== undefined && !delegatedToSelf);

  return (
    <section aria-labelledby="participate-title" className="space-y-4">
      <h2 id="participate-title" className="text-2xl font-semibold text-text">
        {t("Tham gia trong 3 bước", "Take part in 3 steps")}
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        <Step
          index={1}
          icon={Coins}
          title={t("Nhận ECO", "Earn ECO")}
          status={step1}
          action={
            step1 !== "done" && (
              <ButtonLink href="/marketplace" variant="ghost" iconRight={ArrowRight} className="-ml-4">
                {t("Tới Chợ làng chài", "Go to the Village Market")}
              </ButtonLink>
            )
          }
        >
          {t(
            "Mua thủ công biển hoặc đặt tour sinh thái (100 ECO cho mỗi 1 ETH) và làm Nhiệm vụ bảo tồn.",
            "Buy sea crafts or book eco-tours (100 ECO per 1 ETH) and complete Conservation Quests.",
          )}
          {user && <span className="mt-2 block font-medium text-text">{t(`Bạn có ${eco(balance)}.`, `You have ${eco(balance)}.`)}</span>}
        </Step>

        <Step
          index={2}
          icon={Zap}
          title={t("Kích hoạt quyền bỏ phiếu", "Activate voting power")}
          status={step2}
          action={
            needsDelegate ? (
              <TxButton status={status} icon={Zap} onClick={activate}>
                {t("Kích hoạt quyền bỏ phiếu", "Activate voting power")}
              </TxButton>
            ) : undefined
          }
        >
          {delegatedToSelf ? (
            <span className="text-text">
              {t(
                `Quyền biểu quyết đã kích hoạt. Bạn đang có ${eco(votes)} phiếu.`,
                `Voting power is active. You hold ${eco(votes)} in votes.`,
              )}
            </span>
          ) : state === "delegated-elsewhere" ? (
            t(
              `Bạn đang uỷ quyền phiếu cho ${shortenAddress(delegatee ?? "")}. Kích hoạt để tự bỏ phiếu.`,
              `Your votes are delegated to ${shortenAddress(delegatee ?? "")}. Activate to vote yourself.`,
            )
          ) : (
            <>
              <strong className="font-semibold text-warning">{t("Làm một lần, trước khi đề xuất được tạo.", "Do it once, before proposals are created.")}</strong>{" "}
              {t(
                "Phiếu tính theo số ECO đã kích hoạt tại thời điểm đề xuất ra đời; kích hoạt muộn sẽ không bỏ phiếu được cho đề xuất cũ.",
                "Votes count the activated ECO at the moment a proposal is created; activating later won't let you vote on older proposals.",
              )}
            </>
          )}
        </Step>

        <Step
          index={3}
          icon={Vote}
          title={t("Bỏ phiếu", "Vote")}
          status="unknown"
          action={
            <Button variant="ghost" iconRight={ArrowRight} onClick={onShowActive} className="-ml-4">
              {t("Xem đề xuất đang bỏ phiếu", "See proposals in voting")}
            </Button>
          }
        >
          {t(
            "Chọn Đồng ý hoặc Phản đối cho các dự án phục hồi san hô, làm sạch biển. Mỗi ví bỏ phiếu một lần cho mỗi đề xuất.",
            "Vote for or against coral restoration and ocean clean-up projects. Each wallet votes once per proposal.",
          )}
        </Step>
      </ol>
    </section>
  );
}
