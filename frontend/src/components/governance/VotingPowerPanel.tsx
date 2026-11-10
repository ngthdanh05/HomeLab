"use client";

import React from "react";
import type { Address } from "viem";
import { Spinner } from "@/components/marketplace/PurchaseButton";
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
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang kích hoạt quyền biểu quyết", "Activating voting power"),
    success: t("Đã kích hoạt quyền biểu quyết! 🗳️", "Voting power activated! 🗳️"),
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
      className={`flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
        needsDelegate ? "border-amber-700/60 bg-amber-950/20" : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-slate-400">{t("Số dư ECO", "ECO balance")}</p>
          <p className="font-mono text-lg font-bold text-white">
            {balance !== undefined ? formatTokenAmount(balance, 18, 2, locale) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{t("Quyền biểu quyết hiện tại", "Current voting power")}</p>
          <p className="font-mono text-lg font-bold text-emerald-300">
            {votes !== undefined ? formatTokenAmount(votes, 18, 2, locale) : "—"}
          </p>
        </div>
        <div className="max-w-md self-center text-xs text-slate-400">
          {state === "no-tokens" &&
            t("Bạn chưa có ECO. Mua sản phẩm thủ công hoặc hoàn thành quest để nhận ECO.", "You have no ECO yet. Buy handicrafts or complete quests to earn ECO.")}
          {state === "not-delegated" &&
            t(
              "ECO của bạn chưa được tính phiếu. Kích hoạt quyền vote (delegate cho chính mình) để bỏ phiếu cho các đề xuất được tạo sau đó.",
              "Your ECO does not count as votes yet. Activate voting power (delegate to yourself) to vote on proposals created after that.",
            )}
          {state === "delegated-elsewhere" &&
            t(
              `Bạn đang uỷ quyền biểu quyết cho ${shortenAddress(delegatee ?? "")}. Kích hoạt để tự bỏ phiếu.`,
              `You have delegated your votes to ${shortenAddress(delegatee ?? "")}. Activate to vote yourself.`,
            )}
          {state === "active" &&
            t(
              "✅ Quyền biểu quyết đã kích hoạt. Phiếu của mỗi đề xuất tính theo số ECO tại thời điểm đề xuất được tạo.",
              "✅ Voting power is active. Votes on each proposal are based on your ECO when the proposal was created.",
            )}
        </div>
      </div>

      {needsDelegate && (
        <button
          type="button"
          onClick={activate}
          disabled={isBusy}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isBusy && <Spinner />}
          {status === "awaiting-wallet"
            ? t("Xác nhận trong ví…", "Confirm in wallet…")
            : status === "pending"
              ? t("Đang chờ xác nhận…", "Waiting for confirmation…")
              : t("⚡ Kích hoạt quyền vote", "⚡ Activate voting power")}
        </button>
      )}
    </section>
  );
}
