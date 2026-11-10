"use client";

import React from "react";
import Link from "next/link";
import { formatEther, type Address } from "viem";
import { ECO_DECIMALS } from "@/hooks/useEcoTokenBalance";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useListing, useListingMetadata } from "@/hooks/useMarketplace";
import {
  formatDateTime,
  formatTokenAmount,
  getBadgeType,
  type ActivityItem,
  type ActivityKind,
} from "@/lib/dashboard";
import { shortenAddress } from "@/lib/marketplace";
import { getQuest } from "@/data/quests";

const KIND_INFO: Record<ActivityKind, { icon: string; title: string; tone: string }> = {
  purchase: { icon: "🛍️", title: "Mua sản phẩm", tone: "bg-emerald-500/15 text-emerald-300" },
  sale: { icon: "💰", title: "Bán được sản phẩm", tone: "bg-amber-500/15 text-amber-300" },
  listing: { icon: "📦", title: "Đăng bán sản phẩm", tone: "bg-sky-500/15 text-sky-300" },
  cancel: { icon: "✖️", title: "Huỷ đăng bán", tone: "bg-slate-500/15 text-slate-300" },
  income: { icon: "💸", title: "Nhận thanh toán D2C", tone: "bg-amber-500/15 text-amber-300" },
  refund: { icon: "↩️", title: "Được hoàn tiền", tone: "bg-sky-500/15 text-sky-300" },
  reward: { icon: "🌱", title: "Nhận thưởng ECO", tone: "bg-emerald-500/15 text-emerald-300" },
  offset: { icon: "🌍", title: "Bù đắp carbon", tone: "bg-sky-500/15 text-sky-300" },
  quest: { icon: "🎯", title: "Hoàn thành quest", tone: "bg-amber-500/15 text-amber-300" },
  badge: { icon: "🏅", title: "Nhận ImpactBadge", tone: "bg-violet-500/15 text-violet-300" },
};

/** Listing name from its metadata (cached, shared with the marketplace pages). */
function ListingName({ listingId }: { listingId: bigint }) {
  const { listing } = useListing(listingId);
  const metadata = useListingMetadata(listing?.metadataURI);
  return (
    <Link href={`/marketplace/${listingId}`} className="font-medium text-white hover:text-emerald-400">
      {metadata.data?.name ?? `Sản phẩm #${listingId}`}
    </Link>
  );
}

function ActivityRow({ item, explorerUrl }: { item: ActivityItem; explorerUrl?: string }) {
  const info = KIND_INFO[item.kind];
  const sign = item.kind === "purchase" || item.kind === "offset" ? "−" : item.kind === "sale" || item.kind === "income" || item.kind === "refund" ? "+" : "";

  return (
    <li className="flex gap-3 py-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${info.tone}`} aria-hidden>
        {info.icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm text-slate-300">
            {info.title}
            {item.carbonGrams !== undefined && (
              <span className="font-medium text-white">
                {" "}
                {(Number(item.carbonGrams) / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} kg CO₂
              </span>
            )}
            {item.questId !== undefined && (
              <>
                {": "}
                <Link href="/quests" className="font-medium text-white hover:text-emerald-400">
                  {getQuest(item.questId)?.title ?? `Quest #${item.questId}`}
                </Link>
              </>
            )}
            {item.listingId !== undefined && (
              <>
                {": "}
                <ListingName listingId={item.listingId} />
              </>
            )}
          </p>
          {item.amountWei !== undefined && (
            <span className="font-mono text-sm font-semibold text-slate-100">
              {sign}
              {formatEther(item.amountWei)} ETH
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {item.ecoReward !== undefined && item.ecoReward > 0n && (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
              +{formatTokenAmount(item.ecoReward, ECO_DECIMALS)} ECO
            </span>
          )}
          {item.badges.map((b) => {
            const type = getBadgeType(b.badgeType);
            return (
              <span key={b.tokenId.toString()} className="rounded-md bg-violet-500/15 px-2 py-0.5 font-medium text-violet-300">
                {type.icon} {type.label} #{b.tokenId.toString()}
              </span>
            );
          })}
          {item.split && item.kind === "purchase" && (
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-400">
              Nghệ nhân {formatEther(item.split.artisan)} · Quỹ {formatEther(item.split.treasury)} · Nền tảng{" "}
              {formatEther(item.split.platform)} ETH
            </span>
          )}
        </div>

        <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-400">
          <span>{item.timestamp ? formatDateTime(item.timestamp) : `Block #${item.blockNumber}`}</span>
          {explorerUrl ? (
            <a
              href={`${explorerUrl}/tx/${item.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-emerald-400"
            >
              {shortenAddress(item.txHash, 6)} ↗
            </a>
          ) : (
            <span className="font-mono">{shortenAddress(item.txHash, 6)}</span>
          )}
        </p>
      </div>
    </li>
  );
}

export function ActivityFeed({ user }: { user: Address }) {
  const { explorerUrl } = useActiveChain();
  const { data: items, isLoading, error, refetch, isFetching } = useActivityFeed(user);

  return (
    <section aria-labelledby="activity-title" className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-title" className="text-xl font-bold text-white">
          📜 Lịch sử hoạt động
        </h2>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        >
          {isFetching ? "Đang tải…" : "↻ Làm mới"}
        </button>
      </div>

      {isLoading ? (
        <ul className="mt-2 divide-y divide-slate-800" aria-label="Đang tải lịch sử">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-3 py-4" aria-hidden>
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />
              </div>
            </li>
          ))}
        </ul>
      ) : error && !items ? (
        <p className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          Không tải được lịch sử giao dịch từ blockchain (RPC có thể đang quá tải).{" "}
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Thử lại
          </button>
        </p>
      ) : !items || items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          Chưa có hoạt động nào. Giao dịch mua/bán trên{" "}
          <Link href="/marketplace" className="text-emerald-400 hover:underline">
            Marketplace
          </Link>{" "}
          sẽ xuất hiện ở đây.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-800">
          {items.map((item) => (
            <ActivityRow key={item.txHash} item={item} explorerUrl={explorerUrl} />
          ))}
        </ul>
      )}
    </section>
  );
}
