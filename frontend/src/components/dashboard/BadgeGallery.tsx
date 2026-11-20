"use client";

import React, { useMemo, useState } from "react";
import { Award, Shell } from "lucide-react";
import type { Address } from "viem";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useUserBadges } from "@/hooks/useUserBadges";
import { Alert, Button, ButtonLink, EmptyState, FilterChips, type FilterChipItem } from "@/components/ui";
import { BADGE_TYPES } from "@/lib/dashboard";
import { useI18n } from "@/providers/LocaleProvider";
import { BadgeCard, BadgeCardSkeleton } from "./BadgeCard";

type Filter = "all" | `${number}`;

/** Huy hiệu Người giữ biển của ví (ImpactBadge), lọc theo loại. */
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

  const visible = filter === "all" ? badges : badges.filter((b) => String(b.badgeType) === filter);
  const chips: FilterChipItem<Filter>[] = [
    { id: "all", label: t("Tất cả", "All"), count: badges.length },
    ...BADGE_TYPES.filter((type) => counts.has(type.value)).map((type) => ({
      id: `${type.value}` as Filter,
      label: t<string>(type.label, type.labelEn),
      count: counts.get(type.value),
    })),
  ];

  return (
    <section aria-labelledby="badge-gallery-title" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="badge-gallery-title" className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Award aria-hidden className="h-5 w-5 text-accent-strong" />
            {t("Huy hiệu Người giữ biển", "Ocean Keeper badges")}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {t(
              "Mỗi huy hiệu ghi công khai một việc bạn đã làm cho biển. Bấm vào huy hiệu để xem chi tiết.",
              "Each badge publicly records something you did for the sea. Click a badge to see its details.",
            )}
          </p>
        </div>
        {badges.length > 0 && <FilterChips items={chips} value={filter} onChange={setFilter} label={t("Lọc huy hiệu", "Filter badges")} />}
      </div>

      {error && badges.length === 0 ? (
        <Alert
          tone="danger"
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              {t("Thử lại", "Try again")}
            </Button>
          }
        >
          {t("Không đọc được danh sách huy hiệu.", "Could not read your badges.")}
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <BadgeCardSkeleton key={i} />
          ))}
        </div>
      ) : badges.length === 0 ? (
        <EmptyState
          icon={Shell}
          title={t("Bạn chưa có huy hiệu nào", "You have no badges yet")}
          description={t(
            "Mua một món thủ công biển, đặt tour sinh thái hoặc bù carbon chuyến đi để nhận huy hiệu đầu tiên.",
            "Buy a sea craft, book an eco-tour or offset your trip to earn your first badge.",
          )}
          action={<ButtonLink href="/marketplace">{t("Đến Chợ làng chài", "Go to the Village Market")}</ButtonLink>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((badge) => (
            <BadgeCard
              key={badge.tokenId.toString()}
              badge={badge}
              explorerHref={explorerUrl ? `${explorerUrl}/nft/${addresses.impactBadge}/${badge.tokenId}` : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
