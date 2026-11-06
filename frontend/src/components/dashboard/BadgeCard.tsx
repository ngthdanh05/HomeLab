"use client";

import React, { useState } from "react";
import Image from "next/image";
import { remoteImageProps } from "@/lib/image-loader";
import type { UserBadge } from "@/hooks/useUserBadges";
import { formatDateTime, getBadgeType } from "@/lib/dashboard";

interface BadgeCardProps {
  badge: UserBadge;
  /** NFT page on the block explorer, when the chain has one. */
  explorerHref?: string;
}

/** An ImpactBadge NFT; click (or Enter/Space) flips it to show its details. */
export function BadgeCard({ badge, explorerHref }: BadgeCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const type = getBadgeType(badge.badgeType);
  const meta = badge.metadata;
  const title = meta?.name ?? `${type.label} #${badge.tokenId}`;
  const image = !imageFailed ? meta?.image : undefined;

  return (
    <div>
      <div className="flip-card h-72">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={`${title}. ${flipped ? "Đang xem chi tiết, bấm để lật lại" : "Bấm để xem chi tiết"}`}
        className={`flip-card-inner h-full w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${flipped ? "is-flipped" : ""}`}
      >
        {/* Front */}
        <div className="flip-card-face flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="relative h-44 w-full">
            {badge.isMetadataLoading ? (
              <div className="h-full w-full animate-pulse bg-slate-800" aria-hidden />
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
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${type.gradient}`}
                aria-hidden
              >
                <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-black/20 text-5xl shadow-2xl">
                  {type.icon}
                </span>
              </div>
            )}
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">
              #{badge.tokenId.toString()}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {type.icon} {type.label}
              </p>
              <h3 className="mt-1 line-clamp-1 font-semibold text-white">{title}</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              {badge.issuedAt > 0 ? `Mint ${formatDateTime(badge.issuedAt)}` : "Đang tải ngày mint…"}
            </p>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back flex flex-col gap-3 overflow-y-auto rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-slate-900 to-emerald-950 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            Proof of Action · #{badge.tokenId.toString()}
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{meta?.description ?? type.description}</p>
          <dl className="space-y-1.5 text-xs">
            <Detail label="Loại badge" value={`${type.icon} ${type.label}`} />
            <Detail label="Ngày mint" value={badge.issuedAt > 0 ? formatDateTime(badge.issuedAt) : undefined} />
            <Detail label="Địa điểm" value={meta?.location} />
            <Detail label="Hành động" value={meta?.action} />
            <Detail label="Bù đắp carbon" value={meta?.carbonOffset} />
          </dl>
          <span className="mt-auto text-[11px] text-slate-400">Bấm để lật lại</span>
        </div>
      </button>
      </div>
      {explorerHref && (
        <a
          href={explorerHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block text-center text-[11px] text-slate-400 hover:text-emerald-400"
        >
          Xem NFT trên Etherscan ↗
        </a>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-200">{value}</dd>
    </div>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900" aria-hidden>
      <div className="h-44 animate-pulse bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
