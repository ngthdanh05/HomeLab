"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Package, Store } from "lucide-react";
import type { Address } from "viem";
import { ListingImage } from "@/components/marketplace/ListingCard";
import { OrderActions, OrderContact, OrderProgress } from "@/components/marketplace/OrderPanel";
import { Alert, Amount, Button, ButtonLink, Card, EmptyState, FilterChips, LoadingRegion, Skeleton, type FilterChipItem } from "@/components/ui";
import { useListingMetadata } from "@/hooks/useMarketplace";
import { useMyOrders, type MyOrder } from "@/hooks/useOrders";
import { EXPERIENCE_TYPE, getProductType } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

type OrderFilter = "all" | "purchases" | "bookings" | "sales";

const matches = (o: MyOrder, f: OrderFilter) =>
  f === "all" ||
  (f === "sales" && o.role === "seller") ||
  (f === "bookings" && o.role === "buyer" && o.listing.pType === EXPERIENCE_TYPE) ||
  (f === "purchases" && o.role === "buyer" && o.listing.pType !== EXPERIENCE_TYPE);

function OrderCard({ item, escrowPeriod, arbiter }: { item: MyOrder; escrowPeriod: bigint | undefined; arbiter: string | undefined }) {
  const { t } = useI18n();
  const metadata = useListingMetadata(item.listing.metadataURI);
  const type = getProductType(item.listing.pType);
  const isTour = item.listing.pType === EXPERIENCE_TYPE;
  const name = metadata.data?.name ?? `${t("Sản phẩm", "Product")} #${item.listing.id}`;
  const roleLabel =
    item.role === "seller" ? t("Đơn bán", "Sale") : isTour ? t("Lịch đặt tour", "Tour booking") : t("Đơn mua", "Purchase");

  return (
    <Card as="li" padding="md" className="space-y-5" aria-label={`${roleLabel}: ${name}`}>
      <div className="flex gap-4">
        <ListingImage
          src={metadata.data?.image}
          alt=""
          icon={type.icon}
          isLoading={metadata.isLoading}
          className="aspect-[4/3] w-24 shrink-0 rounded-md"
          sizes="96px"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-text-muted">
            {roleLabel} · #{item.listing.id.toString()}
          </p>
          <h3 className="text-lg font-semibold text-text">
            <Link href={`/marketplace/${item.listing.id}`} className="hover:text-primary">
              {name}
            </Link>
          </h3>
          {(metadata.data?.artisan || metadata.data?.village) && (
            <p className="text-sm text-text-muted">{[metadata.data.artisan, metadata.data.village].filter(Boolean).join(" · ")}</p>
          )}
          <p className="text-base font-semibold text-text">
            <Amount value={item.order.price} symbol="ETH" maxFractionDigits={6} />
          </p>
        </div>
      </div>
      <OrderProgress listing={item.listing} order={item.order} escrowPeriod={escrowPeriod} />
      <OrderActions listing={item.listing} order={item.order} escrowPeriod={escrowPeriod} arbiter={arbiter} />
      <OrderContact listing={item.listing} order={item.order} metadata={metadata.data} role={item.role} />
    </Card>
  );
}

/** Đơn hàng & Lịch đặt: người mua theo dõi, xác nhận; nghệ nhân xem đơn bán và hoàn tiền khi cần. */
export function MyOrders({ user }: { user: Address }) {
  const { t } = useI18n();
  const { orders, escrowPeriod, arbiter, isLoading, error, refetch } = useMyOrders(user);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const visible = orders.filter((o) => matches(o, filter));
  const count = (f: OrderFilter) => orders.filter((o) => matches(o, f)).length;

  const chips: FilterChipItem<OrderFilter>[] = [
    { id: "all", label: t("Tất cả", "All"), count: count("all") },
    { id: "purchases", label: t("Đơn mua", "Purchases"), icon: Package, count: count("purchases") },
    { id: "bookings", label: t("Lịch đặt tour", "Tour bookings"), icon: CalendarCheck, count: count("bookings") },
    { id: "sales", label: t("Đơn bán", "Sales"), icon: Store, count: count("sales") },
  ];

  if (error && orders.length === 0) {
    return (
      <Alert
        tone="danger"
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            {t("Thử lại", "Try again")}
          </Button>
        }
      >
        {t("Không tải được đơn hàng từ mạng (máy chủ có thể đang quá tải).", "Could not load your orders (the RPC may be overloaded).")}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <LoadingRegion label={t("Đang tải đơn hàng", "Loading orders")} className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </LoadingRegion>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("Chưa có đơn hàng hay lịch đặt nào", "No orders or bookings yet")}
        description={t(
          "Khi bạn mua thủ công biển hoặc đặt tour, đơn sẽ hiện ở đây để bạn theo dõi và xác nhận.",
          "When you buy sea crafts or book a tour, the order shows up here so you can track and confirm it.",
        )}
        action={<ButtonLink href="/marketplace">{t("Đến Chợ làng chài", "Go to the Village Market")}</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterChips items={chips} value={filter} onChange={setFilter} label={t("Lọc đơn hàng", "Filter orders")} />
      {visible.length === 0 ? (
        <p className="rounded-md bg-surface p-4 text-sm text-text-muted">{t("Không có đơn nào ở mục này.", "No orders in this category.")}</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((item) => (
            <OrderCard key={item.listing.id.toString()} item={item} escrowPeriod={escrowPeriod} arbiter={arbiter} />
          ))}
        </ul>
      )}
    </div>
  );
}
