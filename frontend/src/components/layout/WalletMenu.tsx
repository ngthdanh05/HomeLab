"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { ChevronDown, CircleHelp, Package, UserRound, Wallet } from "lucide-react";
import { cn, Button } from "@/components/ui";
import { DEFAULT_CHAIN_ID, getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";
import { addressGradient, ConnectWalletButton, formatWalletAddress } from "./ConnectWalletButton";
import { Dropdown, DropdownLink } from "./Dropdown";
import { matchesPath } from "./navigation";

const noopSubscribe = () => () => {};

/** Dòng trạng thái mạng: chấm màu + tên mạng, hoặc cảnh báo kèm nút chuyển mạng. */
export function NetworkStatus({ className }: { className?: string }) {
  const { t } = useI18n();
  const { chainId, walletChainId, isWrongNetwork } = useActiveChain();
  const { switchChain, isPending } = useSwitchChain();

  return (
    <div className={cn("space-y-2 rounded-sm bg-bg px-3 py-2 text-sm", className)}>
      <p className="text-xs font-medium text-text-muted">{t("Trạng thái mạng", "Network status")}</p>
      <p className="flex items-center gap-2">
        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", isWrongNetwork ? "bg-warning" : "bg-primary")} />
        <span className={isWrongNetwork ? "text-warning" : "text-text"}>
          {isWrongNetwork
            ? t(
                `Mạng chưa hỗ trợ (${getChainName(walletChainId ?? 0)})`,
                `Unsupported network (${getChainName(walletChainId ?? 0)})`,
              )
            : getChainName(chainId)}
        </span>
      </p>
      {isWrongNetwork && (
        <Button size="md" fullWidth loading={isPending} onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}>
          {t(`Chuyển sang ${getChainName(DEFAULT_CHAIN_ID)}`, `Switch to ${getChainName(DEFAULT_CHAIN_ID)}`)}
        </Button>
      )}
    </div>
  );
}

/**
 * Nút ví ở góc phải header. Chưa kết nối: mở hộp thoại kết nối.
 * Đã kết nối: menu gồm Của tôi, Đơn hàng, Trạng thái mạng và Quản lý ví.
 */
export function WalletMenu() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { address } = useAccount();
  const { open: openWalletModal, prefetch } = useWalletModal();
  const { isWrongNetwork } = useActiveChain();
  // Ví chỉ tồn tại phía trình duyệt: render nút "Kết nối ví" ở server và lần render đầu để hydrate khớp.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted || !address) return <ConnectWalletButton className="px-3 sm:px-4" />;

  const short = formatWalletAddress(address);

  return (
    <Dropdown
      align="end"
      triggerLabel={t(`Ví ${short}, mở menu tài khoản`, `Wallet ${short}, open account menu`)}
      triggerClassName="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-semibold text-text transition-colors hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-3"
      trigger={(open) => (
        <>
          <span className="relative">
            <span className="block h-6 w-6 rounded-full" style={{ background: addressGradient(address) }} aria-hidden />
            {isWrongNetwork && (
              <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-warning" />
            )}
          </span>
          <span className="hidden font-mono sm:inline">{short}</span>
          <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")} />
        </>
      )}
    >
      {(close) => (
        <div className="space-y-1">
          <p className="px-3 pb-1 pt-1 text-xs text-text-muted">
            {t("Ví đang kết nối", "Connected wallet")}
            <span className="block break-all font-mono text-sm text-text">{short}</span>
          </p>
          <DropdownLink
            href="/dashboard"
            icon={UserRound}
            label={t("Của tôi", "My Page")}
            hint={t("ECO, huy hiệu và tác động của bạn", "Your ECO, badges and impact")}
            active={matchesPath(pathname, "/dashboard")}
            onNavigate={close}
          />
          <DropdownLink
            href="/dashboard?tab=orders"
            icon={Package}
            label={t("Đơn hàng & Lịch đặt", "Orders & Bookings")}
            hint={t("Theo dõi, xác nhận đơn mua và tour", "Track and confirm orders and tours")}
            onNavigate={close}
          />
          <NetworkStatus className="my-1" />
          <button
            type="button"
            onClick={() => {
              close();
              openWalletModal();
            }}
            onPointerEnter={prefetch}
            className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm font-medium text-text transition-colors hover:bg-primary-soft"
          >
            <Wallet aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            {t("Quản lý ví · Ngắt kết nối", "Manage wallet · Disconnect")}
          </button>
          <Link
            href="/getting-started"
            onClick={close}
            className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-2 text-sm text-text-muted transition-colors hover:bg-primary-soft hover:text-text"
          >
            <CircleHelp aria-hidden className="h-5 w-5 shrink-0" />
            {t("Hướng dẫn dùng ví", "Wallet guide")}
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
