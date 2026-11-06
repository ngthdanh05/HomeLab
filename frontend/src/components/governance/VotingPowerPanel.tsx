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

/**
 * ECO balance and voting power of the connected wallet. ECO (ERC20Votes) only
 * counts after delegate(); this panel lets the user delegate to themselves.
 */
export function VotingPowerPanel({ user }: { user: Address }) {
  const { addresses } = useActiveChain();
  const { balance, votes, delegatee, state, refetch } = useVotingPower(user);
  const { send, status, isBusy } = useContractTx({
    pending: "Đang kích hoạt quyền biểu quyết",
    success: "Đã kích hoạt quyền biểu quyết! 🗳️",
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
      aria-label="Quyền biểu quyết của bạn"
      className={`flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
        needsDelegate ? "border-amber-700/60 bg-amber-950/20" : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-slate-400">Số dư ECO</p>
          <p className="font-mono text-lg font-bold text-white">
            {balance !== undefined ? formatTokenAmount(balance, 18, 2) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Quyền biểu quyết hiện tại</p>
          <p className="font-mono text-lg font-bold text-emerald-300">
            {votes !== undefined ? formatTokenAmount(votes, 18, 2) : "—"}
          </p>
        </div>
        <div className="max-w-md self-center text-xs text-slate-400">
          {state === "no-tokens" && "Bạn chưa có ECO. Mua sản phẩm thủ công hoặc hoàn thành quest để nhận ECO."}
          {state === "not-delegated" &&
            "ECO của bạn chưa được tính phiếu. Kích hoạt quyền vote (delegate cho chính mình) để bỏ phiếu cho các đề xuất được tạo sau đó."}
          {state === "delegated-elsewhere" &&
            `Bạn đang uỷ quyền biểu quyết cho ${shortenAddress(delegatee ?? "")}. Kích hoạt để tự bỏ phiếu.`}
          {state === "active" &&
            "✅ Quyền biểu quyết đã kích hoạt. Phiếu của mỗi đề xuất tính theo số ECO tại thời điểm đề xuất được tạo."}
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
            ? "Xác nhận trong ví…"
            : status === "pending"
              ? "Đang chờ xác nhận…"
              : "⚡ Kích hoạt quyền vote"}
        </button>
      )}
    </section>
  );
}
