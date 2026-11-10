"use client";

import React from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { MarketplaceABI } from "@/config/contracts";
import { useContractTx, type TxStatus } from "@/hooks/useContractTx";
import { useActiveChain } from "@/hooks/useActiveChain";
import type { Listing } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

const BUSY_LABELS: Partial<Record<TxStatus, { vi: string; en: string }>> = {
  "awaiting-wallet": { vi: "Xác nhận trong ví…", en: "Confirm in wallet…" },
  pending: { vi: "Đang chờ xác nhận on-chain…", en: "Waiting for on-chain confirmation…" },
};

export function PurchaseButton({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { addresses } = useActiveChain();
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang mua sản phẩm", "Buying the product"),
    success: t("Mua hàng thành công! 🎉", "Purchase successful! 🎉"),
  });

  const isOwnListing = address?.toLowerCase() === listing.seller.toLowerCase();
  // "unconfirmed" stays disabled: the purchase was sent and a retry would just revert.
  const isSent = status === "success" || status === "unconfirmed";
  const disabled = isBusy || !listing.isActive || isOwnListing || isSent;

  const busyLabel = BUSY_LABELS[status];
  const label = !listing.isActive
    ? t("Sản phẩm đã được bán", "This product has been sold")
    : isOwnListing
      ? t("Đây là sản phẩm của bạn", "This is your product")
      : status === "success"
        ? t("Đã mua ✓", "Purchased ✓")
        : status === "unconfirmed"
          ? t("Đã gửi, đang chờ xác nhận…", "Sent, waiting for confirmation…")
          : busyLabel
            ? t(busyLabel.vi, busyLabel.en)
            : isConnected
              ? t(`Mua ngay · ${formatEther(listing.price)} ETH`, `Buy now · ${formatEther(listing.price)} ETH`)
              : t("Kết nối ví để mua", "Connect wallet to buy");

  return (
    <>
    <button
      type="button"
      disabled={disabled}
      aria-busy={isBusy}
      onClick={() =>
        send({
          address: addresses.marketplace,
          abi: MarketplaceABI,
          functionName: "purchaseListing",
          args: [listing.id],
          value: listing.price,
        })
      }
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      {isBusy && <Spinner />}
      {label}
    </button>
    </>
  );
}

export function CancelListingButton({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { address } = useAccount();
  const { addresses } = useActiveChain();
  const { send, isBusy } = useContractTx({
    pending: t("Đang huỷ sản phẩm", "Cancelling the listing"),
    success: t("Đã huỷ sản phẩm", "Listing cancelled"),
  });

  if (!listing.isActive || address?.toLowerCase() !== listing.seller.toLowerCase()) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() =>
        send({
          address: addresses.marketplace,
          abi: MarketplaceABI,
          functionName: "cancelListing",
          args: [listing.id],
        })
      }
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-700/60 px-5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50"
    >
      {isBusy && <Spinner />}
      {t("Huỷ đăng bán", "Cancel listing")}
    </button>
  );
}
