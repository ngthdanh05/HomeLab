"use client";

import React from "react";
import type { Address } from "viem";
import { CircleCheck, Zap } from "lucide-react";
import { TxButton } from "@/components/ui";
import { EcoTokenABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useVotingPower } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

/**
 * ECO balance and voting power of the connected wallet. ECO (ERC20Votes) only
 * counts after delegate(); this panel lets the user delegate to themselves.
 */
export function VotingPowerPanel({ user }: { user: Address }) {
  const { locale, t } = useI18n();
  const { addresses } = useActiveChain();
  const { balance, votes, delegatee, state, refetch } = useVotingPower(user);
  const { send, status } = useContractTx({
    pending: t("Đang kích hoạt quyền biểu quyết", "Activating voting power"),
    success: t("Đã kích hoạt quyền biểu quyết!", "Voting power activated!"),
  });

  const activate = async () => {
    const result = await send({
      address: addresses.ecoToken,
      abi: EcoTokenABI,
      functionName: "delegate",
      args: [user],
    });
    if (result) void refetch();
  };

  const needsDelegate = state === "not-delegated" || state === "delegated-elsewhere";

  return (
    <section
      aria-label={t("Quyền biểu quyết của bạn", "Your voting power")}
      className={`flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between ${
        needsDelegate ? "border-warning/30 bg-warning-soft" : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-text-muted">{t("Số dư ECO", "ECO balance")}</p>
          <p className="text-lg font-bold tabular-nums text-text">
            {balance !== undefined ? formatTokenAmount(balance, 18, 2, locale) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">{t("Quyền biểu quyết hiện tại", "Current voting power")}</p>
          <p className="text-lg font-bold tabular-nums text-primary">
            {votes !== undefined ? formatTokenAmount(votes, 18, 2, locale) : "—"}
          </p>
        </div>
        <div className="max-w-md self-center text-xs text-text-muted">
          {state === "no-tokens" &&
            t("Bạn chưa có ECO. Mua sản phẩm thủ công hoặc hoàn thành nhiệm vụ để nhận ECO.", "You have no ECO yet. Buy handicrafts or complete quests to earn ECO.")}
          {state === "not-delegated" &&
            t(
              "ECO của bạn chưa được tính phiếu. Kích hoạt quyền bỏ phiếu để bỏ phiếu cho các đề xuất được tạo sau đó.",
              "Your ECO does not count as votes yet. Activate voting power (delegate to yourself) to vote on proposals created after that.",
            )}
          {state === "delegated-elsewhere" &&
            t(
              `Bạn đang uỷ quyền biểu quyết cho ${shortenAddress(delegatee ?? "")}. Kích hoạt để tự bỏ phiếu.`,
              `You have delegated your votes to ${shortenAddress(delegatee ?? "")}. Activate to vote yourself.`,
            )}
          {state === "active" && (
            <span className="flex items-start gap-2">
              <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
              {t(
                "Quyền biểu quyết đã kích hoạt. Phiếu của mỗi đề xuất tính theo số ECO tại thời điểm đề xuất được tạo.",
                "Voting power is active. Votes on each proposal are based on your ECO when the proposal was created.",
              )}
            </span>
          )}
        </div>
      </div>

      {needsDelegate && (
        <TxButton status={status} icon={Zap} onClick={activate} className="shrink-0">
          {t("Kích hoạt quyền bỏ phiếu", "Activate voting power")}
        </TxButton>
      )}
    </section>
  );
}
