"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Alert, Spinner } from "@/components/ui";
import { GovernanceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { formatTokenAmount } from "@/lib/dashboard";
import { useI18n } from "@/providers/LocaleProvider";

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

/** "Vote For" / "Vote Against" → Governance.vote(); disabled once the wallet has voted. */
export function VoteButtons({ proposalId, isOpen, hasVoted, mySupport, votingPower, onVoted }: VoteButtonsProps) {
  const { locale, t } = useI18n();
  const { isConnected } = useAccount();
  const { addresses } = useActiveChain();
  const [choice, setChoice] = useState<boolean | null>(null);
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang gửi phiếu bầu", "Sending your vote"),
    success: t("Bỏ phiếu thành công!", "Vote recorded!"),
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
      "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted";
    const tone = support
      ? "bg-primary text-white hover:bg-primary-hover"
      : "bg-danger text-white hover:bg-danger/90";
    return (
      <button type="button" onClick={() => vote(support)} disabled={disabled} className={`${base} ${tone}`}>
        {busyHere ? (
          <Spinner />
        ) : support ? (
          <ThumbsUp aria-hidden className="h-5 w-5" />
        ) : (
          <ThumbsDown aria-hidden className="h-5 w-5" />
        )}
        {busyHere
          ? status === "awaiting-wallet"
            ? t("Xác nhận trong ví…", "Confirm in wallet…")
            : t("Đang chờ xác nhận…", "Waiting for confirmation…")
          : support
            ? t("Đồng ý", "Vote For")
            : t("Phản đối", "Vote Against")}
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
        <Alert tone="success">
          {t("Bạn đã bỏ phiếu rồi", "You have already voted")}
          {mySupport !== undefined && (mySupport ? t(" — Đồng ý", ": For") : t(" — Phản đối", ": Against"))}.{" "}
          {t("Mỗi ví chỉ bỏ phiếu một lần cho mỗi đề xuất.", "Each wallet can vote once per proposal.")}
        </Alert>
      ) : !isOpen ? (
        <p className="text-sm text-text-muted">{t("Đề xuất đã hết hạn bỏ phiếu.", "Voting on this proposal has ended.")}</p>
      ) : !isConnected ? (
        <p className="text-sm text-text-muted">{t("Kết nối ví để bỏ phiếu.", "Connect your wallet to vote.")}</p>
      ) : noPower ? (
        <Alert tone="warning" role={null}>
          {t(
            <>
              Ví của bạn không có quyền bỏ phiếu cho đề xuất này: phiếu được tính theo số ECO đã kích hoạt quyền bỏ phiếu{" "}
              <strong>trước khi</strong> đề xuất được tạo. Hãy kích hoạt quyền bỏ phiếu để tham gia các đề xuất sau.
            </>,
            <>
              Your wallet has no voting power on this proposal: votes are counted from ECO with voting power activated
              (delegated) <strong>before</strong> the proposal was created. Activate voting power to join later proposals.
            </>,
          )}
        </Alert>
      ) : votingPower !== undefined ? (
        <p className="text-sm text-text-muted">
          {t("Trọng số phiếu của bạn:", "Your voting weight:")}{" "}
          <span className="font-semibold tabular-nums text-text">{formatTokenAmount(votingPower, 18, 2, locale)} ECO</span>
        </p>
      ) : null}
    </div>
  );
}
