"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Address } from "viem";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useUserBadges } from "@/hooks/useUserBadges";
import { BADGE_TYPES } from "@/lib/dashboard";
import { useI18n } from "@/providers/LocaleProvider";
import { BadgeCard, BadgeCardSkeleton } from "./BadgeCard";

type Filter = "all" | number;

export function BadgeGallery({ owner }: { owner: Address }) {
  const { t } = useI18n();
  const { addresses, explorerUrl } = useActiveChain();
  const { badges, isLoading, error, refetch } = useUserBadges(owner);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of badges) map.set(b.badgeType, (map.get(b.badgeType) ?? 0) + 1);
    return map;
  }, [badges]);

  const visible = filter === "all" ? badges : badges.filter((b) => b.badgeType === filter);

  return (
    <section aria-labelledby="badge-gallery-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="badge-gallery-title" className="text-xl font-bold text-white">
            🏅 {t("Bộ sưu tập ImpactBadge", "ImpactBadge collection")}
          </h2>
          <p className="text-sm text-slate-400">
            {t("NFT Proof of Action ghi nhận đóng góp của bạn. Bấm vào badge để xem chi tiết.", "Proof of Action NFTs record your contributions. Click a badge to see its details.")}
          </p>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("Lọc badge", "Filter badges")}>
            {[{ value: "all" as Filter, label: `${t("Tất cả", "All")} (${badges.length})` }]
              .concat(
                BADGE_TYPES.filter((type) => counts.has(type.value)).map((type) => ({
                  value: type.value,
                  label: `${type.icon} ${type.label} (${counts.get(type.value)})`,
                })),
              )
              .map((f) => (
                <button
                  key={String(f.value)}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.value
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {error && badges.length === 0 ? (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-center text-sm text-red-200">
          {t("Không đọc được danh sách badge.", "Could not read your badges.")}{" "}
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            {t("Thử lại", "Try again")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <BadgeCardSkeleton key={i} />
          ))}
        </div>
      ) : badges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <p className="text-4xl">🌱</p>
          <p className="mt-2 font-semibold text-white">{t("Bạn chưa có badge nào", "You have no badges yet")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {t("Mua một sản phẩm thủ công hoặc tour trải nghiệm để nhận NFT ImpactBadge đầu tiên.", "Buy a handicraft or experience tour to receive your first ImpactBadge NFT.")}
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {t("Đến Marketplace", "Go to Marketplace")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((badge) => (
            <BadgeCard
              key={badge.tokenId.toString()}
              badge={badge}
              explorerHref={
                explorerUrl ? `${explorerUrl}/nft/${addresses.impactBadge}/${badge.tokenId}` : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
