"use client";

import React from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useListingMetadata } from "@/hooks/useMarketplace";
import { getProductType, shortenAddress, type Listing } from "@/lib/marketplace";

export function ListingImage({
  src,
  alt,
  icon,
  isLoading,
  className = "",
}: {
  src?: string;
  alt: string;
  icon: string;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return <div className={`animate-pulse bg-slate-800 ${className}`} aria-hidden />;
  }
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-5xl ${className}`}
        aria-hidden
      >
        {icon}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- IPFS gateway hosts vary per listing
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const metadata = useListingMetadata(listing.metadataURI);
  const type = getProductType(listing.pType);
  const name = metadata.data?.name ?? `Sản phẩm #${listing.id}`;

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="relative">
        <ListingImage
          src={metadata.data?.image}
          alt={name}
          icon={type.icon}
          isLoading={metadata.isLoading}
          className="h-44 w-full"
        />
        <span className="absolute left-3 top-3 rounded-md border border-slate-700 bg-slate-900/85 px-2 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-sm">
          {type.icon} {type.label}
        </span>
        {!listing.isActive && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-700/90 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
            Đã bán / Đã huỷ
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          {metadata.isLoading ? (
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          ) : (
            <h3 className="line-clamp-1 font-semibold text-white group-hover:text-emerald-400">
              {name}
            </h3>
          )}
          {metadata.data?.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{metadata.data.description}</p>
          )}
        </div>

        <div className="flex items-end justify-between border-t border-slate-800 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Giá</p>
            <p className="font-mono text-sm font-bold text-emerald-300">
              {formatEther(listing.price)} ETH
            </p>
          </div>
          <p className="text-right text-[11px] text-slate-500">
            Người bán
            <span className="block font-mono text-slate-300">{shortenAddress(listing.seller)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900" aria-hidden>
      <div className="h-44 animate-pulse bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
