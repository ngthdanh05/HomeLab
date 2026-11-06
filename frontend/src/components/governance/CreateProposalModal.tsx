"use client";

import React, { useEffect, useId, useState } from "react";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { GovernanceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useVotingPower } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import {
  encodeProposalDescription,
  formatDuration,
  parseEthAmount,
  PROPOSAL_LIMITS,
  validateProposalForm,
  type ProposalForm,
} from "@/lib/governance";
import { formatEth } from "./TreasuryStats";

interface CreateProposalModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  proposalThreshold: bigint | undefined;
  votingPeriod: bigint | undefined;
  treasuryBalance: bigint | undefined;
}

const EMPTY_FORM: ProposalForm = { title: "", body: "", amount: "", recipient: "" };

/** Form for Governance.propose(): conservation project, ETH requested, recipient. */
export function CreateProposalModal({
  open,
  onClose,
  onCreated,
  proposalThreshold,
  votingPeriod,
  treasuryBalance,
}: CreateProposalModalProps) {
  const formId = useId();
  const { addresses } = useActiveChain();
  const { address: user, isConnected } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();
  const { balance } = useVotingPower(user);
  const { send, status, isBusy } = useContractTx({
    pending: "Đang tạo đề xuất",
    success: "Tạo đề xuất thành công! 🎉",
  });

  const [form, setForm] = useState<ProposalForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isBusy, onClose]);

  if (!open) return null;

  const amount = parseEthAmount(form.amount);
  const belowThreshold =
    isConnected && balance !== undefined && proposalThreshold !== undefined && balance < proposalThreshold;
  const exceedsTreasury = amount !== null && treasuryBalance !== undefined && amount > treasuryBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return setConnectModalOpen(true);
    const formError = validateProposalForm(form);
    if (formError) return setError(formError);
    if (belowThreshold) return setError("Số dư ECO chưa đạt ngưỡng tối thiểu để tạo đề xuất.");
    setError(null);

    const result = await send({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName: "propose",
      args: [form.recipient.trim(), amount, encodeProposalDescription(form.title, form.body)],
    });
    // Close on "unconfirmed" too: the tx is already sent, resubmitting would duplicate it.
    if (result) {
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !isBusy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="animate-fade-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={`${formId}-title`} className="text-lg font-bold text-white">
              🌱 Đề xuất dự án bảo tồn
            </h2>
            <p className="text-xs text-slate-400">
              Cộng đồng bỏ phiếu bằng ECO
              {votingPeriod !== undefined ? ` trong ${formatDuration(Number(votingPeriod))}` : ""}. Nếu được thông qua,
              Quỹ Cộng đồng giải ngân ETH cho ví nhận.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Đóng"
            className="text-slate-400 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {belowThreshold && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
            🔒 Cần tối thiểu <strong>{formatTokenAmount(proposalThreshold ?? 0n)} ECO</strong> để tạo đề xuất; ví của bạn
            có {formatTokenAmount(balance ?? 0n, 18, 2)} ECO. Mua sản phẩm thủ công hoặc hoàn thành quest để nhận thêm
            ECO.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${formId}-name`} className="mb-1 block text-xs font-medium text-slate-300">
              Tên dự án *
            </label>
            <input
              id={`${formId}-name`}
              className={inputClass}
              value={form.title}
              maxLength={PROPOSAL_LIMITS.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Phục hồi rừng ngập mặn Cẩm Thanh"
              required
            />
          </div>

          <div>
            <label htmlFor={`${formId}-desc`} className="mb-1 block text-xs font-medium text-slate-300">
              Mô tả * <span className="text-slate-500">(mục tiêu, kế hoạch sử dụng quỹ, người thực hiện)</span>
            </label>
            <textarea
              id={`${formId}-desc`}
              className={`${inputClass} resize-y`}
              rows={4}
              value={form.body}
              maxLength={PROPOSAL_LIMITS.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Trồng 2.000 cây đước cùng 30 hộ dân địa phương…"
              required
            />
            <p className="mt-1 text-right text-[11px] text-slate-500">
              {form.body.length}/{PROPOSAL_LIMITS.body}
            </p>
          </div>

          <div>
            <label htmlFor={`${formId}-amount`} className="mb-1 block text-xs font-medium text-slate-300">
              Số ETH yêu cầu *
            </label>
            <input
              id={`${formId}-amount`}
              className={`${inputClass} font-mono`}
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.05"
              required
            />
            {treasuryBalance !== undefined && (
              <p className={`mt-1 text-[11px] ${exceedsTreasury ? "text-amber-300" : "text-slate-500"}`}>
                Quỹ hiện có {formatEth(treasuryBalance)}
                {exceedsTreasury && " — số yêu cầu lớn hơn số dư, đề xuất chỉ giải ngân được khi Quỹ đủ tiền."}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor={`${formId}-recipient`} className="block text-xs font-medium text-slate-300">
                Địa chỉ ví nhận *
              </label>
              {user && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, recipient: user })}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Dùng ví của tôi
                </button>
              )}
            </div>
            <input
              id={`${formId}-recipient`}
              className={`${inputClass} font-mono`}
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy || belowThreshold}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isBusy && <Spinner />}
            {!isConnected
              ? "Kết nối ví để tạo đề xuất"
              : status === "awaiting-wallet"
                ? "Xác nhận trong ví…"
                : status === "pending"
                  ? "Đang chờ xác nhận on-chain…"
                  : "Gửi đề xuất"}
          </button>
        </form>
      </div>
    </div>
  );
}
