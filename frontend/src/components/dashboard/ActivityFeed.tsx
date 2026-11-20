"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Banknote,
  CircleX,
  Earth,
  ExternalLink,
  Leaf,
  Package,
  RefreshCw,
  ScrollText,
  ShoppingBag,
  Target,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatEther, type Address } from "viem";
import { Alert, AppIcon } from "@/components/ui";
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
import { getQuest, localizeQuest } from "@/data/quests";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

// Thưởng (ECO, nhiệm vụ, huy hiệu) dùng màu accent; giao dịch tiền dùng primary.
const KIND_INFO: Record<ActivityKind, { icon: LucideIcon; title: string; titleEn: string; tone: string }> = {
  purchase: { icon: ShoppingBag, title: "Mua sản phẩm", titleEn: "Bought a product", tone: "bg-primary-soft text-primary" },
  sale: { icon: Banknote, title: "Bán được sản phẩm", titleEn: "Sold a product", tone: "bg-primary-soft text-primary" },
  listing: { icon: Package, title: "Đăng bán sản phẩm", titleEn: "Listed a product", tone: "bg-info-soft text-info" },
  cancel: { icon: CircleX, title: "Huỷ đăng bán", titleEn: "Cancelled a listing", tone: "bg-bg text-text-muted" },
  income: { icon: Wallet, title: "Nhận thanh toán từ người mua", titleEn: "Received a D2C payment", tone: "bg-primary-soft text-primary" },
  refund: { icon: Undo2, title: "Được hoàn tiền", titleEn: "Refunded", tone: "bg-info-soft text-info" },
  reward: { icon: Leaf, title: "Nhận thưởng ECO", titleEn: "Earned ECO", tone: "bg-accent-soft text-accent-strong" },
  offset: { icon: Earth, title: "Bù đắp carbon", titleEn: "Carbon offset", tone: "bg-info-soft text-info" },
  quest: { icon: Target, title: "Hoàn thành nhiệm vụ", titleEn: "Completed a quest", tone: "bg-accent-soft text-accent-strong" },
  badge: { icon: Award, title: "Nhận Huy hiệu tác động", titleEn: "Received an ImpactBadge", tone: "bg-accent-soft text-accent-strong" },
};

/** Listing name from its metadata (cached, shared with the marketplace pages). */
function ListingName({ listingId }: { listingId: bigint }) {
  const { t } = useI18n();
  const { listing } = useListing(listingId);
  const metadata = useListingMetadata(listing?.metadataURI);
  return (
    <Link href={`/marketplace/${listingId}`} className="font-medium text-text hover:text-primary">
      {metadata.data?.name ?? `${t("Sản phẩm", "Product")} #${listingId}`}
    </Link>
  );
}

function ActivityRow({ item, explorerUrl }: { item: ActivityItem; explorerUrl?: string }) {
  const { locale, t } = useI18n();
  const info = KIND_INFO[item.kind];
  const KindIcon = info.icon;
  const quest = item.questId !== undefined ? getQuest(item.questId) : undefined;
  const sign = item.kind === "purchase" || item.kind === "offset" ? "−" : item.kind === "sale" || item.kind === "income" || item.kind === "refund" ? "+" : "";

  return (
    <li className="flex gap-3 py-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${info.tone}`} aria-hidden>
        <KindIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm text-text-muted">
            {t(info.title, info.titleEn)}
            {item.carbonGrams !== undefined && (
              <span className="font-medium text-text">
                {" "}
                {(Number(item.carbonGrams) / 1000).toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })} kg CO₂
              </span>
            )}
            {item.questId !== undefined && (
              <>
                {": "}
                <Link href="/quests" className="font-medium text-text hover:text-primary">
                  {quest ? localizeQuest(quest, locale).title : `Quest #${item.questId}`}
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
            <span className="text-sm font-semibold tabular-nums text-text">
              {sign}
              {formatEther(item.amountWei)} ETH
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {item.ecoReward !== undefined && item.ecoReward > 0n && (
            <span className="rounded-sm bg-accent-soft px-2 py-1 font-medium tabular-nums text-accent-strong">
              +{formatTokenAmount(item.ecoReward, ECO_DECIMALS, 4, locale)} ECO
            </span>
          )}
          {item.badges.map((b) => {
            const type = getBadgeType(b.badgeType);
            return (
              <span
                key={b.tokenId.toString()}
                className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-1 font-medium text-accent-strong"
              >
                <AppIcon name={type.icon} className="h-4 w-4" />
                {t<string>(type.label, type.labelEn)} #{b.tokenId.toString()}
              </span>
            );
          })}
          {item.split && item.kind === "purchase" && (
            <span className="rounded-sm bg-bg px-2 py-1 tabular-nums text-text-muted">
              {t("Nghệ nhân", "Artisan")} {formatEther(item.split.artisan)} · {t("Quỹ", "Treasury")} {formatEther(item.split.treasury)} ·{" "}
              {t("Nền tảng", "Platform")} {formatEther(item.split.platform)} ETH
            </span>
          )}
        </div>

        <p className="flex flex-wrap gap-x-3 text-xs text-text-muted">
          <span>{item.timestamp ? formatDateTime(item.timestamp, locale) : `Block #${item.blockNumber}`}</span>
          {explorerUrl ? (
            <a
              href={`${explorerUrl}/tx/${item.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-primary"
            >
              {shortenAddress(item.txHash, 6)}
              <ExternalLink aria-hidden className="h-4 w-4" />
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
  const { t } = useI18n();
  const { explorerUrl } = useActiveChain();
  const { data: items, isLoading, error, refetch, isFetching } = useActivityFeed(user);

  return (
    <section id="activity" aria-labelledby="activity-title" className="scroll-mt-24 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-title" className="flex items-center gap-2 text-xl font-semibold text-text">
          <ScrollText aria-hidden className="h-5 w-5 text-primary" />
          {t("Lịch sử giao dịch", "Transaction history")}
        </h2>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-text-muted transition-colors hover:bg-primary-soft hover:text-text disabled:opacity-50"
        >
          <RefreshCw aria-hidden className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? t("Đang tải…", "Loading…") : t("Làm mới", "Refresh")}
        </button>
      </div>

      {isLoading ? (
        <ul className="mt-2 divide-y divide-border" aria-label={t("Đang tải lịch sử", "Loading history")}>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-3 py-4" aria-hidden>
              <div className="h-10 w-10 animate-pulse rounded-md bg-bg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded-sm bg-bg" />
                <div className="h-3 w-1/3 animate-pulse rounded-sm bg-bg" />
              </div>
            </li>
          ))}
        </ul>
      ) : error && !items ? (
        <Alert tone="danger" className="mt-4">
          {t("Không tải được lịch sử giao dịch từ blockchain (RPC có thể đang quá tải).", "Could not load transaction history from the blockchain (the RPC may be overloaded).")}{" "}
          <button type="button" onClick={() => void refetch()} className="min-h-11 font-semibold underline hover:text-danger">
            {t("Thử lại", "Try again")}
          </button>
        </Alert>
      ) : !items || items.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          {t("Chưa có hoạt động nào. Giao dịch mua/bán trên", "No activity yet. Purchases and sales on the")}{" "}
          <Link href="/marketplace" className="font-semibold text-primary underline">
            {t("Chợ làng chài", "Village Market")}
          </Link>{" "}
          {t("sẽ xuất hiện ở đây.", "will appear here.")}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <ActivityRow key={item.txHash} item={item} explorerUrl={explorerUrl} />
          ))}
        </ul>
      )}
    </section>
  );
}
