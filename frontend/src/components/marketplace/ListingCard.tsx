"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { AppIcon, Amount, Skeleton } from "@/components/ui";
import { useListingMetadata } from "@/hooks/useMarketplace";
import type { IconName } from "@/lib/icon-names";
import { remoteImageProps } from "@/lib/image-loader";
import { getProductType, type Listing } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

/** Lưới sản phẩm: 1 cột trên điện thoại, tối đa 4 cột trên màn rộng. */
const CARD_SIZES = "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function ListingImage({
  src,
  alt,
  icon,
  isLoading,
  className = "",
  sizes = CARD_SIZES,
  priority = false,
}: {
  src?: string;
  alt: string;
  icon: IconName;
  isLoading?: boolean;
  /** Phải có kích thước khung (aspect/chiều cao + chiều rộng): ảnh lấp đầy khung. */
  className?: string;
  sizes?: string;
  /** Ảnh ở màn hình đầu (trang chi tiết): tải ngay. */
  priority?: boolean;
}) {
  if (isLoading) {
    return <div className={`animate-pulse bg-bg ${className}`} aria-hidden />;
  }
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-primary-soft text-primary ${className}`} aria-hidden>
        <AppIcon name={icon} className="h-12 w-12" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" {...remoteImageProps(src)} />
    </div>
  );
}

/**
 * Thẻ sản phẩm: ảnh 4:3, tên, nghệ nhân / ngư dân và làng chài (từ metadata), giá 18px.
 * `inactiveState` phân biệt "Đã bán" và "Đã huỷ".
 */
export function ListingCard({ listing, inactiveState }: { listing: Listing; inactiveState?: "sold" | "cancelled" }) {
  const { t } = useI18n();
  const metadata = useListingMetadata(listing.metadataURI);
  const type = getProductType(listing.pType);
  const name = metadata.data?.name ?? `${t("Sản phẩm", "Product")} #${listing.id}`;
  const artisan = metadata.data?.artisan;
  const village = metadata.data?.village;

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative">
        <ListingImage
          src={metadata.data?.image}
          alt={name}
          icon={type.icon}
          isLoading={metadata.isLoading}
          className="aspect-[4/3] w-full"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-surface px-2 py-1 text-xs font-medium text-primary">
          <AppIcon name={type.icon} className="h-4 w-4" />
          {t<string>(type.shortLabel, type.shortLabelEn)}
        </span>
        {!listing.isActive && (
          <span className="absolute right-3 top-3 rounded-sm bg-text px-2 py-1 text-xs font-semibold text-white">
            {inactiveState === "cancelled" ? t("Đã huỷ", "Cancelled") : t("Đã bán", "Sold")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {metadata.isLoading ? (
          <Skeleton className="h-5 w-3/4" />
        ) : (
          <h3 className="line-clamp-2 text-base font-semibold text-text group-hover:text-primary">{name}</h3>
        )}
        <div className="space-y-1 text-sm text-text-muted">
          <p className="flex items-center gap-2">
            <UserRound aria-hidden className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{artisan ?? t("Nghệ nhân làng chài", "Local artisan")}</span>
          </p>
          {village && (
            <p className="flex items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{village}</span>
            </p>
          )}
        </div>
        <p className="mt-auto border-t border-border pt-3 text-lg font-semibold text-primary">
          <span className="sr-only">{t("Giá", "Price")}: </span>
          <Amount value={listing.price} symbol="ETH" maxFractionDigits={6} />
        </p>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}
