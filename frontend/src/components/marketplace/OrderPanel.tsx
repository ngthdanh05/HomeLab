"use client";

import React from "react";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { MarketplaceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useChainNow } from "@/hooks/useGovernance";
import { useOrder } from "@/hooks/useMarketplace";
import { getOrderActions, ORDER_STATUS, type Listing } from "@/lib/marketplace";

const TONES = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-600",
  danger: "border border-red-700/60 text-red-300 hover:bg-red-950/40",
  neutral: "bg-slate-700 text-white hover:bg-slate-600",
} as const;

function OrderAction({
  label,
  functionName,
  args,
  pending,
  success,
  tone = "neutral",
}: {
  label: string;
  functionName: string;
  args: readonly unknown[];
  pending: string;
  success: string;
  tone?: keyof typeof TONES;
}) {
  const { addresses } = useActiveChain();
  const { send, isBusy } = useContractTx({ pending, success });
  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => send({ address: addresses.marketplace, abi: MarketplaceABI, functionName, args })}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${TONES[tone]}`}
    >
      {isBusy && <Spinner />}
      {label}
    </button>
  );
}

const STATUS_TEXT: Record<number, string> = {
  [ORDER_STATUS.paid]: "Tiền đang được giữ an toàn trong escrow, chưa chuyển cho nghệ nhân.",
  [ORDER_STATUS.disputed]: "Đơn hàng đang khiếu nại. Tiền được giữ tới khi có phán quyết.",
  [ORDER_STATUS.released]: "Đơn hàng đã hoàn tất: tiền đã chia cho nghệ nhân, Quỹ Cộng đồng và nền tảng.",
  [ORDER_STATUS.refunded]: "Đơn hàng đã được hoàn tiền cho người mua.",
};

/** Escrow state of a sold listing and the actions the connected wallet can take on it. */
export function OrderPanel({ listing }: { listing: Listing }) {
  const { address } = useAccount();
  const now = useChainNow(30_000);
  const { order, escrowPeriod, arbiter } = useOrder(listing.id);

  if (!order || order.status === ORDER_STATUS.none) return null;

  const actions = getOrderActions({ order, seller: listing.seller, arbiter, user: address, now, escrowPeriod });
  const id = [listing.id] as const;
  const releasableAt = escrowPeriod !== undefined ? Number(order.paidAt + escrowPeriod) : undefined;

  return (
    <section aria-label="Trạng thái đơn hàng" className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-300">{STATUS_TEXT[order.status]}</p>
      {order.status === ORDER_STATUS.paid && releasableAt !== undefined && (
        <p className="text-xs text-slate-400" suppressHydrationWarning>
          Nếu người mua không phản hồi, tiền được giải ngân từ {new Date(releasableAt * 1000).toLocaleString("vi-VN")}.
        </p>
      )}
      {actions.canConfirm && (
        <OrderAction
          label="✅ Đã nhận hàng, giải ngân cho nghệ nhân"
          functionName="confirmDelivery"
          args={id}
          pending="Đang xác nhận nhận hàng"
          success="Đã xác nhận nhận hàng! 🌱 ECO và ImpactBadge đã về ví"
          tone="primary"
        />
      )}
      {actions.canRelease && (
        <OrderAction
          label="Giải ngân (đã hết hạn escrow)"
          functionName="releaseAfterTimeout"
          args={id}
          pending="Đang giải ngân"
          success="Đã giải ngân cho nghệ nhân"
        />
      )}
      {actions.canRefund && (
        <OrderAction
          label="Hoàn tiền cho người mua"
          functionName="refundBuyer"
          args={id}
          pending="Đang hoàn tiền"
          success="Đã hoàn tiền cho người mua"
          tone="danger"
        />
      )}
      {actions.canDispute && (
        <OrderAction
          label="Khiếu nại đơn hàng"
          functionName="openDispute"
          args={id}
          pending="Đang gửi khiếu nại"
          success="Đã gửi khiếu nại"
          tone="danger"
        />
      )}
      {actions.canResolve && (
        <div className="grid gap-2 sm:grid-cols-2">
          <OrderAction
            label="Phán quyết: hoàn tiền"
            functionName="resolveDispute"
            args={[listing.id, true]}
            pending="Đang xử lý tranh chấp"
            success="Đã hoàn tiền cho người mua"
            tone="danger"
          />
          <OrderAction
            label="Phán quyết: giải ngân"
            functionName="resolveDispute"
            args={[listing.id, false]}
            pending="Đang xử lý tranh chấp"
            success="Đã giải ngân cho nghệ nhân"
          />
        </div>
      )}
    </section>
  );
}
