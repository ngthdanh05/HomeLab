"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { AppIcon } from "@/components/ui";
import { remoteImageProps } from "@/lib/image-loader";
import type { UserBadge } from "@/hooks/useUserBadges";
import { formatDateTime, getBadgeType } from "@/lib/dashboard";
import { useI18n } from "@/providers/LocaleProvider";

// Màu phẳng theo loại huy hiệu (không dùng gradient trong thẻ, docs/UX-UI.md 4.3).
const BADGE_TONES: Record<number, { art: string; label: string }> = {
  0: { art: "bg-primary-soft text-primary", label: "text-primary" },
  1: { art: "bg-info-soft text-info", label: "text-info" },
  2: { art: "bg-accent-soft text-accent-strong", label: "text-accent-strong" },
  3: { art: "bg-warning-soft text-warning", label: "text-warning" },
};

interface BadgeCardProps {
  badge: UserBadge;
  /** NFT page on the block explorer, when the chain has one. */
  explorerHref?: string;
}

/** An ImpactBadge NFT; click (or Enter/Space) flips it to show its details. */
export function BadgeCard({ badge, explorerHref }: BadgeCardProps) {
  const { locale, t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const type = getBadgeType(badge.badgeType);
  const typeLabel = t<string>(type.label, type.labelEn);
  const meta = badge.metadata;
  const title = meta?.name ?? `${typeLabel} #${badge.tokenId}`;
  const image = !imageFailed ? meta?.image : undefined;
  const tone = BADGE_TONES[type.value] ?? BADGE_TONES[0];

  return (
    <div>
      <div className="flip-card h-72">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={`${title}. ${flipped ? t("Đang xem chi tiết, bấm để lật lại", "Showing details, click to flip back") : t("Bấm để xem chi tiết", "Click to see details")}`}
        className={`flip-card-inner h-full w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${flipped ? "is-flipped" : ""}`}
      >
        {/* Front */}
        <div className="flip-card-face flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <div className="relative h-44 w-full">
            {badge.isMetadataLoading ? (
              <div className="h-full w-full animate-pulse bg-bg" aria-hidden />
            ) : image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                onError={() => setImageFailed(true)}
                className="object-cover"
                {...remoteImageProps(image)}
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center ${tone.art}`}
                aria-hidden
              >
                <span className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface">
                  <AppIcon name={type.icon} className="h-12 w-12" />
                </span>
              </div>
            )}
            <span className="absolute right-3 top-3 rounded-full bg-text/70 px-2 py-1 text-xs font-medium tabular-nums text-white">
              #{badge.tokenId.toString()}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <p className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${tone.label}`}>
                <AppIcon name={type.icon} className="h-4 w-4" />
                {typeLabel}
              </p>
              <h3 className="mt-1 line-clamp-1 font-semibold text-text">{title}</h3>
            </div>
            <p className="text-xs text-text-muted">
              {badge.issuedAt > 0 ? `${t("Nhận ngày", "Minted")} ${formatDateTime(badge.issuedAt, locale)}` : t("Đang tải ngày nhận…", "Loading mint date…")}
            </p>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back flex flex-col gap-3 overflow-y-auto rounded-lg border border-border-strong bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t("Huy hiệu tác động", "Proof of Action")} · #{badge.tokenId.toString()}
          </p>
          <p className="text-sm leading-relaxed text-text">{meta?.description ?? t<string>(type.description, type.descriptionEn)}</p>
          <dl className="space-y-2 text-xs">
            <Detail label={t("Loại huy hiệu", "Badge type")} value={typeLabel} />
            <Detail label={t("Ngày nhận", "Mint date")} value={badge.issuedAt > 0 ? formatDateTime(badge.issuedAt, locale) : undefined} />
            <Detail label={t("Địa điểm", "Location")} value={meta?.location} />
            <Detail label={t("Hành động", "Action")} value={meta?.action} />
            <Detail label={t("Bù đắp carbon", "Carbon offset")} value={meta?.carbonOffset} />
          </dl>
          <span className="mt-auto text-xs text-text-muted">{t("Bấm để lật lại", "Click to flip back")}</span>
        </div>
      </button>
      </div>
      {explorerHref && (
        <a
          href={explorerHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-11 items-center justify-center gap-1 text-center text-xs text-text-muted hover:text-primary"
        >
          {t("Xem bản ghi công khai trên Etherscan", "View NFT on Etherscan")}
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium text-text">{value}</dd>
    </div>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="h-72 overflow-hidden rounded-lg border border-border bg-surface" aria-hidden>
      <div className="h-44 animate-pulse bg-bg" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-sm bg-bg" />
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-bg" />
      </div>
    </div>
  );
}
