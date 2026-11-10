"use client";

import React from "react";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { MarketplaceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useChainNow } from "@/hooks/useGovernance";
import { useOrder } from "@/hooks/useMarketplace";
import { intlLocale } from "@/lib/i18n";
import { getOrderActions, ORDER_STATUS, type Listing } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

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

const STATUS_TEXT: Record<number, { vi: string; en: string }> = {
  [ORDER_STATUS.paid]: {
    vi: "Tiền đang được giữ an toàn trong escrow, chưa chuyển cho nghệ nhân.",
    en: "The money is held safely in escrow and has not been sent to the artisan yet.",
  },
  [ORDER_STATUS.disputed]: {
    vi: "Đơn hàng đang khiếu nại. Tiền được giữ tới khi có phán quyết.",
    en: "This order is under dispute. The money is held until a ruling is made.",
  },
  [ORDER_STATUS.released]: {
    vi: "Đơn hàng đã hoàn tất: tiền đã chia cho nghệ nhân, Quỹ Cộng đồng và nền tảng.",
    en: "Order complete: the money has been split between the artisan, the Community Treasury and the platform.",
  },
  [ORDER_STATUS.refunded]: {
    vi: "Đơn hàng đã được hoàn tiền cho người mua.",
    en: "This order has been refunded to the buyer.",
  },
};

/** Escrow state of a sold listing and the actions the connected wallet can take on it. */
export function OrderPanel({ listing }: { listing: Listing }) {
  const { locale, t } = useI18n();
  const { address } = useAccount();
  const now = useChainNow(30_000);
  const { order, escrowPeriod, arbiter } = useOrder(listing.id);

  if (!order || order.status === ORDER_STATUS.none) return null;

  const actions = getOrderActions({ order, seller: listing.seller, arbiter, user: address, now, escrowPeriod });
  const id = [listing.id] as const;
  const releasableAt = escrowPeriod !== undefined ? Number(order.paidAt + escrowPeriod) : undefined;
  const statusText = STATUS_TEXT[order.status];

  return (
    <section aria-label={t("Trạng thái đơn hàng", "Order status")} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-300">{statusText && t(statusText.vi, statusText.en)}</p>
      {order.status === ORDER_STATUS.paid && releasableAt !== undefined && (
        <p className="text-xs text-slate-400" suppressHydrationWarning>
          {t("Nếu người mua không phản hồi, tiền được giải ngân từ", "If the buyer does not respond, the money can be released from")}{" "}
          {new Date(releasableAt * 1000).toLocaleString(intlLocale(locale))}.
        </p>
      )}
      {actions.canConfirm && (
        <OrderAction
          label={t("✅ Đã nhận hàng, giải ngân cho nghệ nhân", "✅ Received, release payment to the artisan")}
          functionName="confirmDelivery"
          args={id}
          pending={t("Đang xác nhận nhận hàng", "Confirming delivery")}
          success={t("Đã xác nhận nhận hàng! 🌱 ECO và ImpactBadge đã về ví", "Delivery confirmed! 🌱 ECO and your ImpactBadge are in your wallet")}
          tone="primary"
        />
      )}
      {actions.canRelease && (
        <OrderAction
          label={t("Giải ngân (đã hết hạn escrow)", "Release payment (escrow period ended)")}
          functionName="releaseAfterTimeout"
          args={id}
          pending={t("Đang giải ngân", "Releasing payment")}
          success={t("Đã giải ngân cho nghệ nhân", "Payment released to the artisan")}
        />
      )}
      {actions.canRefund && (
        <OrderAction
          label={t("Hoàn tiền cho người mua", "Refund the buyer")}
          functionName="refundBuyer"
          args={id}
          pending={t("Đang hoàn tiền", "Refunding")}
          success={t("Đã hoàn tiền cho người mua", "Buyer refunded")}
          tone="danger"
        />
      )}
      {actions.canDispute && (
        <OrderAction
          label={t("Khiếu nại đơn hàng", "Dispute this order")}
          functionName="openDispute"
          args={id}
          pending={t("Đang gửi khiếu nại", "Submitting dispute")}
          success={t("Đã gửi khiếu nại", "Dispute submitted")}
          tone="danger"
        />
      )}
      {actions.canResolve && (
        <div className="grid gap-2 sm:grid-cols-2">
          <OrderAction
            label={t("Phán quyết: hoàn tiền", "Ruling: refund")}
            functionName="resolveDispute"
            args={[listing.id, true]}
            pending={t("Đang xử lý tranh chấp", "Resolving dispute")}
            success={t("Đã hoàn tiền cho người mua", "Buyer refunded")}
            tone="danger"
          />
          <OrderAction
            label={t("Phán quyết: giải ngân", "Ruling: release payment")}
            functionName="resolveDispute"
            args={[listing.id, false]}
            pending={t("Đang xử lý tranh chấp", "Resolving dispute")}
            success={t("Đã giải ngân cho nghệ nhân", "Payment released to the artisan")}
          />
        </div>
      )}
    </section>
  );
}
