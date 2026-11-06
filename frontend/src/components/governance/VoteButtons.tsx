"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { GovernanceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { formatTokenAmount } from "@/lib/dashboard";

interface VoteButtonsProps {
  proposalId: bigint;
  /** Voting is open (now < deadline). */
  isOpen: boolean;
  hasVoted: boolean | undefined;
  /** The wallet's side when known (from VoteCast events). */
  mySupport?: boolean;
  /** getPastVotes(user, snapshotBlock); undefined while loading or disconnected. */
  votingPower: bigint | undefined;
  onVoted?: () => void;
}

/** "Vote For 👍" / "Vote Against 👎" → Governance.vote(); disabled once the wallet has voted. */
export function VoteButtons({ proposalId, isOpen, hasVoted, mySupport, votingPower, onVoted }: VoteButtonsProps) {
  const { isConnected } = useAccount();
  const { addresses } = useActiveChain();
  const [choice, setChoice] = useState<boolean | null>(null);
  const { send, status, isBusy } = useContractTx({
    pending: "Đang gửi phiếu bầu",
    success: "Bỏ phiếu thành công! 🗳️",
  });

  const vote = async (support: boolean) => {
    setChoice(support);
    const result = await send({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName: "vote",
      args: [proposalId, support],
    });
    if (result) onVoted?.();
  };

  const noPower = isConnected && votingPower === 0n;
  const disabled = !isOpen || isBusy || hasVoted === true || noPower;

  const button = (support: boolean) => {
    const busyHere = isBusy && choice === support;
    const base =
      "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400";
    const tone = support
      ? "bg-emerald-700 text-white hover:bg-emerald-600"
      : "bg-red-600/90 text-white hover:bg-red-500";
    return (
      <button type="button" onClick={() => vote(support)} disabled={disabled} className={`${base} ${tone}`}>
        {busyHere && <Spinner />}
        {busyHere
          ? status === "awaiting-wallet"
            ? "Xác nhận trong ví…"
            : "Đang chờ xác nhận…"
          : support
            ? "Vote For 👍"
            : "Vote Against 👎"}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {isOpen && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {button(true)}
          {button(false)}
        </div>
      )}

      {hasVoted ? (
        <p role="status" className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          ✅ Bạn đã vote rồi
          {mySupport !== undefined && (mySupport ? " — Đồng ý 👍" : " — Phản đối 👎")}. Mỗi ví chỉ bỏ phiếu một lần
          cho mỗi đề xuất.
        </p>
      ) : !isOpen ? (
        <p className="text-sm text-slate-400">Đề xuất đã hết hạn bỏ phiếu.</p>
      ) : !isConnected ? (
        <p className="text-sm text-slate-400">Kết nối ví để bỏ phiếu.</p>
      ) : noPower ? (
        <p className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
          Ví của bạn không có quyền biểu quyết cho đề xuất này: phiếu được tính theo số ECO đã kích hoạt quyền vote
          (delegate) <strong>trước khi</strong> đề xuất được tạo. Hãy kích hoạt quyền vote để tham gia các đề xuất sau.
        </p>
      ) : votingPower !== undefined ? (
        <p className="text-sm text-slate-400">
          Trọng số phiếu của bạn:{" "}
          <span className="font-semibold text-slate-200">{formatTokenAmount(votingPower, 18, 2)} ECO</span>
        </p>
      ) : null}
    </div>
  );
}
