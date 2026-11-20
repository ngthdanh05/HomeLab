"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, Copy, Flag, MessageCircle, Undo2, type LucideIcon } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Address, Button, ConfirmDialog, Field, ProgressSteps, Textarea, type ProgressStep } from "@/components/ui";
import { MarketplaceABI } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useChainNow } from "@/hooks/useGovernance";
import { useOrder } from "@/hooks/useMarketplace";
import { formatDateTime } from "@/lib/dashboard";
import {
  buildSellerMessage,
  contactHref,
  EXPERIENCE_TYPE,
  getOrderActions,
  getOrderStage,
  ORDER_STATUS,
  type Listing,
  type ListingMetadata,
  type Order,
} from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

interface OrderContext {
  listing: Listing;
  order: Order;
  escrowPeriod: bigint | undefined;
  arbiter: string | undefined;
}

// ─────────────────────────── Dòng tiến trình ───────────────────────────

/** Đã thanh toán → Đã nhận hàng / Hoàn thành tour → Đã giải ngân, kèm hạn tự động giải ngân. */
export function OrderProgress({ listing, order, escrowPeriod }: Omit<OrderContext, "arbiter">) {
  const { locale, t } = useI18n();
  const isTour = listing.pType === EXPERIENCE_TYPE;
  const stage = getOrderStage(order, escrowPeriod);

  const labels = {
    paid: t("Đã thanh toán", "Paid"),
    received:
      stage.outcome === "disputed"
        ? t("Đang khiếu nại", "Under dispute")
        : stage.outcome === "refunded"
          ? t("Đã hoàn tiền", "Refunded")
          : isTour
            ? t("Hoàn thành tour", "Tour completed")
            : t("Đã nhận hàng", "Received"),
    released: t("Đã giải ngân cho người bán", "Paid out to the seller"),
  };
  const hints: Partial<Record<string, React.ReactNode>> = {
    paid: t("Tiền được giữ an toàn", "Money held safely"),
    received:
      stage.releasableAt !== undefined ? (
        <span suppressHydrationWarning>
          {t("Tự động giải ngân từ", "Auto-release from")} {formatDateTime(stage.releasableAt, locale)}
        </span>
      ) : stage.outcome === "disputed" ? (
        t("Trọng tài đang xem xét", "An arbiter is reviewing it")
      ) : undefined,
  };

  const steps: ProgressStep[] = stage.steps.map((s) => ({ key: s.key, state: s.state, label: labels[s.key], hint: hints[s.key] }));
  return (
    <ProgressSteps
      steps={steps}
      label={t("Tiến trình đơn hàng", "Order progress")}
      stateLabels={{
        done: t("đã xong", "done"),
        current: t("đang chờ", "waiting"),
        upcoming: t("chưa tới", "not yet"),
        warning: t("cần chú ý", "needs attention"),
      }}
    />
  );
}

// ─────────────────────────── Hành động có xác nhận ───────────────────────────

interface ConfirmedActionProps {
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
  functionName: string;
  args: readonly unknown[];
  pending: string;
  success: string;
  confirm: { title: string; consequences: React.ReactNode[]; confirmLabel: string; tone?: "primary" | "danger" };
}

/** Nút hành động không đảo ngược: mở hộp thoại nêu hậu quả rồi mới gửi giao dịch. */
function ConfirmedAction({ label, icon, variant = "secondary", functionName, args, pending, success, confirm }: ConfirmedActionProps) {
  const { addresses } = useActiveChain();
  const { send, status, isBusy } = useContractTx({ pending, success });
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} icon={icon} loading={isBusy} fullWidth onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={confirm.title}
        consequences={confirm.consequences}
        confirmLabel={confirm.confirmLabel}
        tone={confirm.tone ?? (variant === "danger" ? "danger" : "primary")}
        status={status}
        onConfirm={async () => {
          const result = await send({ address: addresses.marketplace, abi: MarketplaceABI, functionName, args });
          if (result) setOpen(false);
        }}
      />
    </>
  );
}

/** Các hành động ví đang kết nối được phép làm với đơn (hợp đồng kiểm tra lại cùng quy tắc). */
export function OrderActions({ listing, order, escrowPeriod, arbiter }: OrderContext) {
  const { t } = useI18n();
  const { address } = useAccount();
  const now = useChainNow(30_000);
  const actions = getOrderActions({ order, seller: listing.seller, arbiter, user: address, now, escrowPeriod });
  const isTour = listing.pType === EXPERIENCE_TYPE;
  const id = [listing.id] as const;
  const price = `${formatEther(order.price)} ETH`;

  const releaseConsequences = [
    t(
      `${price} được chia ngay: 70% cho người bán, 20% vào Quỹ bảo tồn biển, 10% phí nền tảng.`,
      `${price} is split at once: 70% to the seller, 20% to the Ocean Conservation Fund, 10% platform fee.`,
    ),
    t("Đơn hàng không thể khiếu nại hay hoàn tiền sau bước này.", "The order can no longer be disputed or refunded after this."),
  ];

  if (!Object.values(actions).some(Boolean)) return null;

  return (
    <div className="grid gap-3">
      {actions.canConfirm && (
        <ConfirmedAction
          variant="primary"
          icon={CircleCheck}
          label={isTour ? t("Đã hoàn thành tour, giải ngân", "Tour completed, release payment") : t("Đã nhận hàng, giải ngân", "Received, release payment")}
          functionName="confirmDelivery"
          args={id}
          pending={isTour ? t("Đang xác nhận hoàn thành tour", "Confirming the tour") : t("Đang xác nhận nhận hàng", "Confirming delivery")}
          success={t("Đã xác nhận nhận hàng! ECO và Huy hiệu tác động đã về ví", "Delivery confirmed! ECO and your ImpactBadge are in your wallet")}
          confirm={{
            title: isTour ? t("Xác nhận đã hoàn thành tour?", "Confirm the tour is complete?") : t("Xác nhận đã nhận hàng?", "Confirm you received it?"),
            consequences: [
              ...releaseConsequences,
              t("Bạn nhận ECO và Huy hiệu Người giữ biển cho đơn này.", "You receive ECO and an Ocean Keeper badge for this order."),
            ],
            confirmLabel: isTour ? t("Xác nhận hoàn thành tour", "Confirm tour completed") : t("Xác nhận đã nhận hàng", "Confirm received"),
          }}
        />
      )}
      {actions.canRelease && (
        <ConfirmedAction
          icon={BadgeCheck}
          label={t("Giải ngân (đã hết hạn giữ tiền)", "Release payment (escrow period ended)")}
          functionName="releaseAfterTimeout"
          args={id}
          pending={t("Đang giải ngân", "Releasing payment")}
          success={t("Đã giải ngân cho người bán", "Payment released to the seller")}
          confirm={{ title: t("Giải ngân đơn hàng này?", "Release this order's payment?"), consequences: releaseConsequences, confirmLabel: t("Giải ngân", "Release payment") }}
        />
      )}
      {actions.canDispute && (
        <ConfirmedAction
          variant="danger"
          icon={Flag}
          label={t("Khiếu nại đơn hàng", "Dispute this order")}
          functionName="openDispute"
          args={id}
          pending={t("Đang gửi khiếu nại", "Submitting dispute")}
          success={t("Đã gửi khiếu nại", "Dispute submitted")}
          confirm={{
            title: t("Gửi khiếu nại cho đơn này?", "Dispute this order?"),
            consequences: [
              t("Tiền tiếp tục được giữ và không tự động giải ngân khi hết hạn.", "The money stays held and is no longer released automatically."),
              t("Trọng tài sẽ quyết định hoàn tiền cho bạn hoặc giải ngân cho người bán.", "An arbiter decides whether to refund you or pay the seller."),
              t("Không thể rút lại khiếu nại. Hãy nhắn cho người bán trước nếu chỉ là giao chậm.", "A dispute cannot be withdrawn. Message the seller first if it is only late."),
            ],
            confirmLabel: t("Gửi khiếu nại", "Submit dispute"),
          }}
        />
      )}
      {actions.canRefund && (
        <ConfirmedAction
          variant="danger"
          icon={Undo2}
          label={t("Hoàn tiền cho người mua", "Refund the buyer")}
          functionName="refundBuyer"
          args={id}
          pending={t("Đang hoàn tiền", "Refunding")}
          success={t("Đã hoàn tiền cho người mua", "Buyer refunded")}
          confirm={{
            title: t("Hoàn tiền cho người mua?", "Refund the buyer?"),
            consequences: [
              t(`Toàn bộ ${price} được trả lại ví người mua.`, `The full ${price} goes back to the buyer's wallet.`),
              t("Bạn sẽ không nhận được tiền của đơn này.", "You will not be paid for this order."),
            ],
            confirmLabel: t("Hoàn tiền", "Refund"),
          }}
        />
      )}
      {actions.canResolve && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ConfirmedAction
            variant="danger"
            label={t("Phán quyết: hoàn tiền", "Ruling: refund")}
            functionName="resolveDispute"
            args={[listing.id, true]}
            pending={t("Đang xử lý tranh chấp", "Resolving dispute")}
            success={t("Đã hoàn tiền cho người mua", "Buyer refunded")}
            confirm={{
              title: t("Phán quyết hoàn tiền?", "Rule a refund?"),
              consequences: [t(`${price} trả lại người mua, người bán không nhận được tiền.`, `${price} goes back to the buyer; the seller is not paid.`)],
              confirmLabel: t("Hoàn tiền cho người mua", "Refund the buyer"),
            }}
          />
          <ConfirmedAction
            label={t("Phán quyết: giải ngân", "Ruling: release payment")}
            functionName="resolveDispute"
            args={[listing.id, false]}
            pending={t("Đang xử lý tranh chấp", "Resolving dispute")}
            success={t("Đã giải ngân cho người bán", "Payment released to the seller")}
            confirm={{ title: t("Phán quyết giải ngân?", "Rule to release the payment?"), consequences: releaseConsequences, confirmLabel: t("Giải ngân", "Release payment") }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Liên hệ off-chain ───────────────────────────

const DRAFT_KEY = (id: bigint) => `bluereef.order-note.${id}`;

function readDraft(id: bigint): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY(id)) ?? "";
  } catch {
    return "";
  }
}

/**
 * Trao đổi giao hàng / giờ đón ngoài blockchain: người mua thấy kênh liên hệ người bán công bố
 * và soạn sẵn tin nhắn để gửi; không có dữ liệu cá nhân nào được ghi lên chain hay máy chủ.
 */
export function OrderContact({
  listing,
  order,
  metadata,
  role,
}: {
  listing: Listing;
  order: Order;
  metadata: ListingMetadata | null | undefined;
  role: "buyer" | "seller";
}) {
  const { locale, t } = useI18n();
  const isTour = listing.pType === EXPERIENCE_TYPE;
  // Bản nháp chỉ lưu trên trình duyệt này để không mất khi tải lại trang. Khối này chỉ render
  // phía client (cần dữ liệu đơn hàng on-chain) nên đọc localStorage ngay khi khởi tạo là an toàn.
  const [note, setNote] = useState(() => (typeof window === "undefined" ? "" : readDraft(listing.id)));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (order.status === ORDER_STATUS.refunded) return null;

  const contact = metadata?.contact;
  const href = contactHref(contact);

  if (role === "seller") {
    return (
      <div className="space-y-2 rounded-md bg-bg p-4 text-sm">
        <p className="font-semibold text-text">{isTour ? t("Liên hệ khách đặt tour", "Contact the guest") : t("Liên hệ người mua", "Contact the buyer")}</p>
        <p className="text-text-muted">
          {contact
            ? t(`Người mua sẽ nhắn cho bạn qua kênh đã công bố: ${contact}.`, `The buyer will message you via the channel you published: ${contact}.`)
            : t(
                "Sản phẩm chưa có kênh liên hệ. Hãy đăng lại kèm số Zalo / email để người mua hẹn giao hàng.",
                "This listing has no contact channel. List again with a phone / email so buyers can arrange delivery.",
              )}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-text-muted">
          {t("Ví người mua:", "Buyer wallet:")} <Address value={order.buyer} />
        </p>
      </div>
    );
  }

  const message = buildSellerMessage({ listingId: listing.id, listingName: metadata?.name ?? `#${listing.id}`, note, isTour }, locale);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // Clipboard bị chặn: người dùng vẫn chọn và sao chép được chữ trong ô.
    }
  };

  return (
    <details className="group rounded-md border border-border bg-bg">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-text">
        <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
        {isTour ? t("Hẹn giờ đón với người tổ chức", "Arrange pickup with the organiser") : t("Hẹn giao hàng với người bán", "Arrange delivery with the seller")}
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm">
        <p className="text-text-muted">
          {t(
            "Địa chỉ và số điện thoại của bạn không được ghi lên blockchain. Hãy gửi trực tiếp cho người bán qua kênh dưới đây.",
            "Your address and phone number are never written on-chain. Send them directly to the seller via the channel below.",
          )}
        </p>
        <p>
          <span className="text-text-muted">{t("Kênh liên hệ:", "Contact channel:")} </span>
          {href ? (
            <a href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer" className="font-semibold text-primary underline">
              {contact}
            </a>
          ) : (
            <span className="font-semibold text-text">{contact ?? t("Người bán chưa công bố", "Not published by the seller")}</span>
          )}
        </p>
        {isTour && metadata?.schedule && (
          <p>
            <span className="text-text-muted">{t("Lịch tour:", "Tour schedule:")} </span>
            <span className="text-text">{metadata.schedule}</span>
          </p>
        )}
        <Field
          label={isTour ? t("Ngày đi, số khách, điểm đón", "Date, guests, pickup point") : t("Tên, số điện thoại, địa chỉ nhận", "Name, phone, delivery address")}
          hint={t("Chỉ lưu tạm trên trình duyệt này.", "Only kept as a draft in this browser.")}
        >
          <Textarea
            rows={3}
            value={note}
            maxLength={500}
            onChange={(e) => {
              setNote(e.target.value);
              try {
                window.localStorage.setItem(DRAFT_KEY(listing.id), e.target.value);
              } catch {
                // Storage bị chặn: chỉ mất bản nháp.
              }
            }}
          />
        </Field>
        <Button variant="secondary" icon={Copy} onClick={copy}>
          {copied ? t("Đã sao chép tin nhắn", "Message copied") : t("Sao chép tin nhắn gửi người bán", "Copy message for the seller")}
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? t("Đã sao chép", "Copied") : ""}
        </span>
      </div>
    </details>
  );
}

// ─────────────────────────── Khối đơn hàng ở trang sản phẩm ───────────────────────────

/** Trạng thái giữ tiền của sản phẩm đã bán, hiện cho mọi người; hành động chỉ hiện cho bên liên quan. */
export function OrderPanel({ listing, metadata }: { listing: Listing; metadata?: ListingMetadata | null }) {
  const { t } = useI18n();
  const { address } = useAccount();
  const { order, escrowPeriod, arbiter } = useOrder(listing.id);

  if (!order || order.status === ORDER_STATUS.none) return null;

  const user = address?.toLowerCase();
  const role = user === order.buyer.toLowerCase() ? "buyer" : user === listing.seller.toLowerCase() ? "seller" : null;

  return (
    <section aria-label={t("Trạng thái đơn hàng", "Order status")} className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <OrderProgress listing={listing} order={order} escrowPeriod={escrowPeriod} />
      <OrderActions listing={listing} order={order} escrowPeriod={escrowPeriod} arbiter={arbiter} />
      {role && <OrderContact listing={listing} order={order} metadata={metadata} role={role} />}
    </section>
  );
}
