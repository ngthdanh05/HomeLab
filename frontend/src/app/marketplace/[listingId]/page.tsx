"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, PackageSearch, ShieldCheck, UserRound } from "lucide-react";
import { ListingImage } from "@/components/marketplace/ListingCard";
import { OrderPanel } from "@/components/marketplace/OrderPanel";
import { CancelListingButton, PurchaseButton, usePurchase } from "@/components/marketplace/PurchaseButton";
import { SplitBreakdown } from "@/components/marketplace/SplitBreakdown";
import { Address, Alert, Amount, AppIcon, ButtonLink, Card, EmptyState, LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useListing, useListingMetadata } from "@/hooks/useMarketplace";
import { getProductType, type Listing, type ListingMetadata } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

function parseListingId(raw: string | string[] | undefined): bigint | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[1-9]\d{0,18}$/.test(value) ? BigInt(value) : null;
}

function BackLink() {
  const { t } = useI18n();
  return (
    <Link href="/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-text-muted hover:text-primary">
      <ArrowLeft aria-hidden className="h-4 w-4" />
      {t("Quay lại Chợ làng chài", "Back to the Village Market")}
    </Link>
  );
}

export default function ListingDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ listingId: string }>();
  const listingId = parseListingId(params.listingId);
  const { listing, notFound, isLoading, error, refetch } = useListing(listingId);
  const metadata = useListingMetadata(listing?.metadataURI);

  if (listingId === null || notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={PackageSearch}
          title={t("Không tìm thấy sản phẩm này", "This product could not be found")}
          description={t("Sản phẩm có thể đã bị gỡ hoặc đường dẫn không đúng.", "It may have been removed, or the link is wrong.")}
          action={<ButtonLink href="/marketplace">{t("Xem sản phẩm khác", "Browse other products")}</ButtonLink>}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Alert
          tone="danger"
          title={t("Không đọc được dữ liệu sản phẩm từ mạng.", "Could not read product data from the network.")}
          action={
            <button type="button" onClick={() => void refetch()} className="min-h-11 font-semibold underline">
              {t("Thử lại", "Try again")}
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="space-y-4">
        <BackLink />
        <LoadingRegion label={t("Đang tải sản phẩm", "Loading product")} className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <SkeletonText lines={4} />
          </div>
        </LoadingRegion>
      </div>
    );
  }

  return <ListingDetail listing={listing} metadata={metadata.data} metadataLoading={metadata.isLoading} metadataError={metadata.isError} />;
}

function ListingDetail({
  listing,
  metadata,
  metadataLoading,
  metadataError,
}: {
  listing: Listing;
  metadata: ListingMetadata | null | undefined;
  metadataLoading: boolean;
  metadataError: boolean;
}) {
  const { t } = useI18n();
  const { addresses } = useActiveChain();
  const purchase = usePurchase(listing);
  const type = getProductType(listing.pType);
  const name = metadata?.name ?? `${t("Sản phẩm", "Product")} #${listing.id}`;
  const isTour = purchase.isTour;

  const commitment = isTour
    ? t(
        "Tiền được giữ an toàn tới khi bạn hoàn thành tour. Bạn nhận ECO và Huy hiệu Người giữ biển khi xác nhận.",
        "Your money is held safely until the tour is done. You receive ECO and an Ocean Keeper badge when you confirm.",
      )
    : t(
        "Tiền được giữ an toàn tới khi bạn nhận hàng. Bạn nhận ECO và Huy hiệu Người giữ biển khi xác nhận.",
        "Your money is held safely until you receive your order. You receive ECO and an Ocean Keeper badge when you confirm.",
      );

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <BackLink />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ListingImage
          src={metadata?.image}
          alt={name}
          icon={type.icon}
          isLoading={metadataLoading}
          className="aspect-[4/3] w-full self-start rounded-lg border border-border"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />

        <div className="space-y-8">
          {/* 1. Tên → giá → nút mua → cam kết giữ tiền */}
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <AppIcon name={type.icon} className="h-4 w-4" />
                {t<string>(type.label, type.labelEn)}
              </p>
              <h1 className="text-3xl font-bold leading-tight text-text">{name}</h1>
              {(metadata?.artisan || metadata?.village) && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
                  {metadata.artisan && (
                    <span className="inline-flex items-center gap-2">
                      <UserRound aria-hidden className="h-4 w-4" />
                      {metadata.artisan}
                    </span>
                  )}
                  {metadata.village && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin aria-hidden className="h-4 w-4" />
                      {metadata.village}
                    </span>
                  )}
                </p>
              )}
            </div>

            <Card padding="sm" className="space-y-4">
              <p className="text-3xl font-bold text-text">
                <span className="sr-only">{t("Giá", "Price")}: </span>
                <Amount value={listing.price} symbol="ETH" maxFractionDigits={6} />
                <span className="ml-2 text-sm font-medium text-text-muted">{t("thử nghiệm", "testnet")}</span>
              </p>
              <PurchaseButton listing={listing} purchase={purchase} />
              <p className="flex items-start gap-2 text-sm text-text-muted">
                <ShieldCheck aria-hidden className="mt-px h-5 w-5 shrink-0 text-primary" />
                {commitment}
              </p>
              <CancelListingButton listing={listing} />
            </Card>

            {purchase.status === "success" && (
              <Alert tone="success" title={t("Tiếp theo là gì?", "What happens next?")}>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>{isTour ? t("Nhắn người tổ chức để hẹn ngày đi và điểm đón.", "Message the organiser to set the date and pickup point.") : t("Nhắn người bán để hẹn địa chỉ giao hàng.", "Message the seller to arrange delivery.")}</li>
                  <li>{isTour ? t("Sau chuyến đi, bấm “Đã hoàn thành tour” để giải ngân.", "After the trip, press “Tour completed” to release the payment.") : t("Khi nhận được hàng, bấm “Đã nhận hàng” để giải ngân.", "When it arrives, press “Received” to release the payment.")}</li>
                  <li>
                    {t("Theo dõi đơn trong", "Track it in")}{" "}
                    <Link href="/dashboard?tab=orders" className="font-semibold text-primary underline">
                      {t("Của tôi → Đơn hàng & Lịch đặt", "My Page → Orders & Bookings")}
                    </Link>
                    .
                  </li>
                </ol>
              </Alert>
            )}

            <OrderPanel listing={listing} metadata={metadata} />
          </div>

          {/* 2. Mô tả, câu chuyện nghệ nhân */}
          {(metadata?.description || metadataError) && (
            <section aria-labelledby="listing-description" className="space-y-2">
              <h2 id="listing-description" className="text-lg font-semibold text-text">
                {t("Mô tả", "Description")}
              </h2>
              {metadata?.description && <p className="whitespace-pre-line text-base leading-relaxed text-text-muted">{metadata.description}</p>}
              {metadataError && (
                <Alert tone="warning">
                  {t("Không tải được thông tin chi tiết của sản phẩm. Dữ liệu đã ghi công khai vẫn hợp lệ.", "Could not load the product details. The on-chain record is still valid.")}
                </Alert>
              )}
            </section>
          )}

          {(metadata?.artisan || metadata?.village || metadata?.schedule) && (
            <section aria-labelledby="listing-artisan" className="space-y-3">
              <h2 id="listing-artisan" className="text-lg font-semibold text-text">
                {isTour ? t("Về người tổ chức", "About the organiser") : t("Về nghệ nhân", "About the artisan")}
              </h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {metadata.artisan && (
                  <div>
                    <dt className="text-text-muted">{t("Nghệ nhân / ngư dân", "Artisan / fisher")}</dt>
                    <dd className="font-medium text-text">{metadata.artisan}</dd>
                  </div>
                )}
                {metadata.village && (
                  <div>
                    <dt className="text-text-muted">{t("Làng chài", "Village")}</dt>
                    <dd className="font-medium text-text">{metadata.village}</dd>
                  </div>
                )}
                {isTour && metadata.schedule && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-2 text-text-muted">
                      <CalendarClock aria-hidden className="h-4 w-4" />
                      {t("Lịch tour", "Tour schedule")}
                    </dt>
                    <dd className="font-medium text-text">{metadata.schedule}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* 3. Tiền đi về đâu */}
          <section aria-labelledby="listing-split" className="space-y-3">
            <h2 id="listing-split" className="text-lg font-semibold text-text">
              {t("Tiền của bạn đi về đâu?", "Where does your money go?")}
            </h2>
            <SplitBreakdown price={listing.price} />
          </section>

          <details className="rounded-md border border-border bg-surface">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-text">
              {t("Chi tiết giao dịch", "Transaction details")}
            </summary>
            <dl className="space-y-3 px-4 pb-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-text-muted">{t("Mã sản phẩm", "Listing ID")}</dt>
                <dd className="tabular-nums text-text">#{listing.id.toString()}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-text-muted">{t("Ví người bán", "Seller wallet")}</dt>
                <dd>
                  <Address value={listing.seller} />
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-text-muted">{t("Hợp đồng Chợ làng chài", "Market contract")}</dt>
                <dd>
                  <Address value={addresses.marketplace} />
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </div>

      {/* Thanh mua dính dưới đáy trên mobile, ngay trên thanh tab (h-16). */}
      {purchase.canBuy && (
        <div
          className="fixed inset-x-0 z-30 border-t border-border bg-surface px-4 py-3 lg:hidden"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <p className="shrink-0 text-lg font-bold text-text">
              <span className="sr-only">{t("Giá", "Price")}: </span>
              <Amount value={listing.price} symbol="ETH" maxFractionDigits={6} />
            </p>
            <PurchaseButton listing={listing} purchase={purchase} size="md" className="flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}
