"use client";

import React from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { MarketplaceABI } from "@/config/contracts";
import { useContractTx, type TxStatus } from "@/hooks/useContractTx";
import { useActiveChain } from "@/hooks/useActiveChain";
import type { Listing } from "@/lib/marketplace";

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

const BUSY_LABELS: Partial<Record<TxStatus, string>> = {
  "awaiting-wallet": "Xác nhận trong ví…",
  pending: "Đang chờ xác nhận on-chain…",
};

export function PurchaseButton({ listing }: { listing: Listing }) {
  const { address, isConnected } = useAccount();
  const { addresses } = useActiveChain();
  const { send, status, isBusy } = useContractTx({
    pending: "Đang mua sản phẩm",
    success: "Mua hàng thành công! 🎉",
  });

  const isOwnListing = address?.toLowerCase() === listing.seller.toLowerCase();
  // "unconfirmed" stays disabled: the purchase was sent and a retry would just revert.
  const isSent = status === "success" || status === "unconfirmed";
  const disabled = isBusy || !listing.isActive || isOwnListing || isSent;

  const label = !listing.isActive
    ? "Sản phẩm đã được bán"
    : isOwnListing
      ? "Đây là sản phẩm của bạn"
      : status === "success"
        ? "Đã mua ✓"
        : status === "unconfirmed"
          ? "Đã gửi, đang chờ xác nhận…"
          : (BUSY_LABELS[status] ??
            (isConnected
              ? `Mua ngay · ${formatEther(listing.price)} ETH`
              : "Kết nối ví để mua"));

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
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      {isBusy && <Spinner />}
      {label}
    </button>
    {isSent && (
      <Link
        href="/dashboard"
        className="mt-2 block text-center text-sm font-medium text-emerald-400 hover:underline"
      >
        🌱 Xem ECO thưởng & ImpactBadge trong Dashboard →
      </Link>
    )}
    </>
  );
}

export function CancelListingButton({ listing }: { listing: Listing }) {
  const { address } = useAccount();
  const { addresses } = useActiveChain();
  const { send, isBusy } = useContractTx({
    pending: "Đang huỷ sản phẩm",
    success: "Đã huỷ sản phẩm",
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
      Huỷ đăng bán
    </button>
  );
}
