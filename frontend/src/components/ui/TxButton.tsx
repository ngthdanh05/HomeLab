"use client";

import React from "react";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { ArrowLeftRight, Wallet } from "lucide-react";
import type { TxStatus } from "@/hooks/useContractTx";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";
import { Button, type ButtonProps } from "./Button";

export interface TxButtonProps extends Omit<ButtonProps, "loading" | "onClick"> {
  /** Trạng thái từ `useContractTx().status`. */
  status: TxStatus;
  /** Gửi giao dịch (thường là `() => send({...})`). Chỉ được gọi khi ví đã kết nối đúng mạng. */
  onClick: () => void | Promise<unknown>;
  /** Ghi đè nhãn khi đang bận; mặc định dùng nhãn chung. */
  busyLabels?: Partial<Record<"awaiting-wallet" | "pending", string>>;
}

/**
 * Nút gửi giao dịch, tự xử lý các trạng thái của ví:
 * chưa kết nối → "Kết nối ví" · sai mạng → "Chuyển sang <mạng>" ·
 * chờ ký trong ví · chờ mạng xác nhận. Chỉ khi ví sẵn sàng mới gọi `onClick`.
 */
export function TxButton({ status, onClick, busyLabels, children, icon, disabled, ...rest }: TxButtonProps) {
  const { t } = useI18n();
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const config = useConfig();
  const { chainId, isWrongNetwork } = useActiveChain();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { open: openWalletModal, prefetch } = useWalletModal();

  // Đang khôi phục kết nối sau khi tải trang: không hiện "Kết nối ví" cho người đã kết nối.
  const restoring = !isConnected && (isConnecting || isReconnecting);

  if (!isConnected && !restoring) {
    return (
      <Button {...rest} icon={Wallet} onClick={openWalletModal} onMouseEnter={prefetch} onFocus={prefetch}>
        {t("Kết nối ví", "Connect wallet")}
      </Button>
    );
  }

  if (isWrongNetwork) {
    const chainName = config.chains.find((c) => c.id === chainId)?.name ?? `#${chainId}`;
    return (
      <Button {...rest} icon={ArrowLeftRight} loading={isSwitching} onClick={() => switchChain({ chainId })}>
        {isSwitching ? t("Đang chuyển mạng…", "Switching network…") : t(`Chuyển sang ${chainName}`, `Switch to ${chainName}`)}
      </Button>
    );
  }

  const busyLabel =
    status === "awaiting-wallet"
      ? (busyLabels?.["awaiting-wallet"] ?? t("Xác nhận trong ví…", "Confirm in wallet…"))
      : status === "pending"
        ? (busyLabels?.pending ?? t("Đang xử lý giao dịch…", "Processing transaction…"))
        : null;

  return (
    <>
      <Button
        {...rest}
        icon={icon}
        loading={busyLabel !== null || restoring}
        disabled={disabled}
        onClick={() => void onClick()}
      >
        {busyLabel ?? children}
      </Button>
      {/* Nhãn nút đổi không được trình đọc màn hình đọc lại; vùng live báo tiến trình. */}
      <span className="sr-only" aria-live="polite">
        {busyLabel ?? ""}
      </span>
    </>
  );
}
