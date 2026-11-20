"use client";

import React, { useState } from "react";
import { Check, ShoppingBag, Trash2 } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Button, ConfirmDialog, TxButton, type ButtonProps } from "@/components/ui";
import { MarketplaceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { EXPERIENCE_TYPE, type Listing } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

/**
 * Trạng thái mua của một sản phẩm. Trang chi tiết dùng chung một hook cho nút ở cột phải
 * và thanh mua dính trên mobile, để hai nút luôn cùng trạng thái giao dịch.
 */
export function usePurchase(listing: Listing) {
  const { t } = useI18n();
  const { address } = useAccount();
  const { addresses } = useActiveChain();
  const isTour = listing.pType === EXPERIENCE_TYPE;
  const tx = useContractTx({
    pending: isTour ? t("Đang đặt tour", "Booking the tour") : t("Đang mua sản phẩm", "Buying the product"),
    success: isTour ? t("Đặt tour thành công!", "Tour booked!") : t("Mua hàng thành công!", "Purchase successful!"),
  });
  const isOwnListing = address?.toLowerCase() === listing.seller.toLowerCase();
  // "unconfirmed": giao dịch đã gửi, gửi lại chỉ bị revert.
  const isSent = tx.status === "success" || tx.status === "unconfirmed";

  return {
    ...tx,
    isTour,
    isOwnListing,
    isSent,
    canBuy: listing.isActive && !isOwnListing && !isSent,
    buy: () =>
      tx.send({
        address: addresses.marketplace,
        abi: MarketplaceABI,
        functionName: "purchaseListing",
        args: [listing.id],
        value: listing.price,
      }),
  };
}

export type PurchaseState = ReturnType<typeof usePurchase>;

/** Nút mua / đặt tour: tự xử lý kết nối ví, sai mạng và các trạng thái giao dịch. */
export function PurchaseButton({
  listing,
  purchase,
  size = "lg",
  className,
}: {
  listing: Listing;
  purchase: PurchaseState;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { t } = useI18n();
  const price = `${formatEther(listing.price)} ETH`;

  if (!listing.isActive || purchase.isOwnListing || purchase.isSent) {
    const label = purchase.isSent
      ? purchase.status === "unconfirmed"
        ? t("Đã gửi, đang chờ xác nhận…", "Sent, waiting for confirmation…")
        : purchase.isTour
          ? t("Đã đặt", "Booked")
          : t("Đã mua", "Purchased")
      : !listing.isActive
        ? purchase.isTour
          ? t("Tour đã được đặt", "This tour has been booked")
          : t("Sản phẩm đã được bán", "This product has been sold")
        : t("Đây là sản phẩm của bạn", "This is your product");
    return (
      <Button size={size} fullWidth disabled icon={purchase.status === "success" ? Check : undefined} className={className}>
        {label}
      </Button>
    );
  }

  return (
    <TxButton
      size={size}
      fullWidth
      icon={ShoppingBag}
      status={purchase.status}
      onClick={purchase.buy}
      className={className}
      busyLabels={{ pending: t("Đang chờ mạng xác nhận…", "Waiting for on-chain confirmation…") }}
    >
      {purchase.isTour ? t(`Đặt tour ngay · ${price}`, `Book now · ${price}`) : t(`Mua ngay · ${price}`, `Buy now · ${price}`)}
    </TxButton>
  );
}

/** Huỷ đăng bán (chỉ người bán, khi sản phẩm còn bán), có bước xác nhận. */
export function CancelListingButton({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { address } = useAccount();
  const { addresses } = useActiveChain();
  const [open, setOpen] = useState(false);
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang huỷ sản phẩm", "Cancelling the listing"),
    success: t("Đã huỷ sản phẩm", "Listing cancelled"),
  });

  if (!listing.isActive || address?.toLowerCase() !== listing.seller.toLowerCase()) return null;

  return (
    <>
      <Button variant="ghost" icon={Trash2} fullWidth loading={isBusy} onClick={() => setOpen(true)} className="text-danger hover:bg-danger-soft">
        {t("Huỷ đăng bán", "Cancel listing")}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        tone="danger"
        title={t("Huỷ đăng bán sản phẩm này?", "Cancel this listing?")}
        consequences={[
          t("Sản phẩm bị gỡ khỏi Chợ làng chài, không ai mua được nữa.", "The product is removed from the market and can no longer be bought."),
          t("Muốn bán lại bạn phải đăng một sản phẩm mới.", "To sell it again you need to create a new listing."),
        ]}
        confirmLabel={t("Huỷ đăng bán", "Cancel listing")}
        status={status}
        onConfirm={async () => {
          const result = await send({ address: addresses.marketplace, abi: MarketplaceABI, functionName: "cancelListing", args: [listing.id] });
          if (result) setOpen(false);
        }}
      />
    </>
  );
}
