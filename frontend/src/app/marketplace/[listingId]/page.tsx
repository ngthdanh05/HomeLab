"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { ListingImage } from "@/components/marketplace/ListingCard";
import { CancelListingButton, PurchaseButton } from "@/components/marketplace/PurchaseButton";
import { SplitBreakdown } from "@/components/marketplace/SplitBreakdown";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useListing, useListingMetadata } from "@/hooks/useMarketplace";
import { getProductType } from "@/lib/marketplace";
import { useConfig } from "wagmi";

function parseListingId(raw: string | string[] | undefined): bigint | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[1-9]\d{0,18}$/.test(value) ? BigInt(value) : null;
}

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const listingId = parseListingId(params.listingId);
  const { listing, notFound, isLoading, error } = useListing(listingId);
  const metadata = useListingMetadata(listing?.metadataURI);
  const { chainId } = useActiveChain();
  const explorer = useConfig().chains.find((c) => c.id === chainId)?.blockExplorers?.default.url;

  const backLink = (
    <Link href="/marketplace" className="text-sm text-slate-400 hover:text-emerald-400">
      ← Quay lại Marketplace
    </Link>
  );

  if (listingId === null || notFound) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
          Không tìm thấy sản phẩm này.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <div role="alert" className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6 text-red-300">
          ⚠️ Không đọc được dữ liệu sản phẩm từ blockchain.
        </div>
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="space-y-4" aria-busy="true">
        {backLink}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-slate-800" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  const type = getProductType(listing.pType);
  const name = metadata.data?.name ?? `Sản phẩm #${listing.id}`;

  return (
    <div className="space-y-4">
      {backLink}
      <div className="grid gap-8 lg:grid-cols-2">
        <ListingImage
          src={metadata.data?.image}
          alt={name}
          icon={type.icon}
          isLoading={metadata.isLoading}
          className="aspect-square w-full rounded-2xl border border-slate-800"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />

        <div className="space-y-6">
          <div className="space-y-2">
            <span className="inline-flex rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-emerald-400">
              {type.icon} {type.label} · #{listing.id.toString()}
            </span>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{name}</h1>
            {metadata.data?.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {metadata.data.description}
              </p>
            )}
            {metadata.isError && (
              <p className="text-xs text-amber-400">
                Không tải được thông tin chi tiết từ IPFS. Dữ liệu on-chain vẫn hợp lệ.
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Giá</dt>
              <dd className="font-mono text-lg font-bold text-emerald-300">
                {formatEther(listing.price)} ETH
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Trạng thái</dt>
              <dd className={listing.isActive ? "text-emerald-400" : "text-slate-400"}>
                {listing.isActive ? "● Đang bán" : "Đã bán / Đã huỷ"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-slate-400">Người bán (nghệ nhân)</dt>
              <dd className="break-all font-mono text-xs text-slate-300">
                {explorer ? (
                  <a
                    href={`${explorer}/address/${listing.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-400"
                  >
                    {listing.seller} ↗
                  </a>
                ) : (
                  listing.seller
                )}
              </dd>
            </div>
          </dl>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="mb-3 text-xs font-medium text-slate-400">
              Khoản thanh toán này sẽ được chia tự động:
            </p>
            <SplitBreakdown price={listing.price} />
          </div>

          <div className="space-y-3">
            <PurchaseButton listing={listing} />
            <CancelListingButton listing={listing} />
            <p className="text-center text-xs text-slate-400">
              🏅 Người mua nhận NFT ImpactBadge (Proof of Action) sau khi giao dịch thành công.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
