"use client";

import React from "react";
import { HandCoins } from "lucide-react";
import { Alert, Spinner } from "@/components/ui";
import { GovernanceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import type { ProposalStatus } from "@/lib/governance";
import { useI18n } from "@/providers/LocaleProvider";
import { formatEth } from "./TreasuryStats";

interface ExecuteProposalButtonProps {
  proposalId: bigint;
  status: ProposalStatus;
  amount: bigint;
  treasuryBalance: bigint | undefined;
  onExecuted?: () => void;
}

/**
 * Governance.execute() once voting has ended with quorum: disburses from the
 * Treasury when For > Against, otherwise records the rejection. Anyone may call it.
 */
export function ExecuteProposalButton({
  proposalId,
  status,
  amount,
  treasuryBalance,
  onExecuted,
}: ExecuteProposalButtonProps) {
  const { locale, t } = useI18n();
  const { addresses } = useActiveChain();
  const passed = status === "passed";
  const { send, status: txStatus, isBusy } = useContractTx({
    pending: passed ? t("Đang thực thi giải ngân", "Executing disbursement") : t("Đang chốt kết quả đề xuất", "Finalizing the proposal result"),
    success: passed ? t("Đã giải ngân từ Quỹ bảo tồn biển!", "Disbursed from the Ocean Conservation Fund!") : t("Đã chốt: đề xuất bị từ chối", "Finalized: the proposal was rejected"),
  });

  if (status !== "passed" && status !== "defeated") return null;

  const underfunded = passed && treasuryBalance !== undefined && treasuryBalance < amount;

  const execute = async () => {
    const result = await send({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName: "execute",
      args: [proposalId],
    });
    if (result) onExecuted?.();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-text-muted">
        {passed
          ? t(
              `Đề xuất đã được thông qua. Bất kỳ ai cũng có thể thực thi để Quỹ chuyển ${formatEth(amount, locale)} tới ví nhận.`,
              `The proposal passed. Anyone can execute it so the Treasury sends ${formatEth(amount, locale)} to the recipient wallet.`,
            )
          : t(
              "Đề xuất không được thông qua. Bấm để ghi công khai kết quả từ chối (không giải ngân).",
              "The proposal did not pass. Execute it to record the rejection on-chain (no disbursement).",
            )}
      </p>
      {underfunded && (
        <Alert tone="warning" role="alert">
          {t(
            `Quỹ hiện chỉ có ${formatEth(treasuryBalance, locale)}, chưa đủ để giải ngân. Giao dịch sẽ bị từ chối cho tới khi Quỹ nhận thêm ETH.`,
            `The Treasury only holds ${formatEth(treasuryBalance, locale)}, which is not enough to disburse. The transaction will be rejected until the Treasury receives more ETH.`,
          )}
        </Alert>
      )}
      <button
        type="button"
        onClick={execute}
        disabled={isBusy || underfunded}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-border disabled:text-text-muted ${
          passed
            ? "bg-primary text-white hover:bg-primary-hover"
            : "border border-border-strong bg-surface text-text hover:border-primary hover:bg-primary-soft"
        }`}
      >
        {isBusy ? <Spinner /> : passed && <HandCoins aria-hidden className="h-5 w-5" />}
        {txStatus === "awaiting-wallet"
          ? t("Xác nhận trong ví…", "Confirm in wallet…")
          : txStatus === "pending"
            ? t("Đang chờ mạng xác nhận…", "Waiting for on-chain confirmation…")
            : passed
              ? t("Thực thi giải ngân", "Execute disbursement")
              : t("Chốt kết quả: từ chối", "Finalize result: rejected")}
      </button>
    </div>
  );
}
