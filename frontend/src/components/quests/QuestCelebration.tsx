"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/ui";
import { localizeQuest, type QuestDefinition } from "@/data/quests";
import { getBadgeType } from "@/lib/dashboard";
import { useI18n } from "@/providers/LocaleProvider";

// Màu pháo giấy theo bảng màu: primary, accent, info + vàng nắng và xanh biển nhạt.
const COLORS = [
  "rgb(var(--color-primary))",
  "rgb(var(--color-accent))",
  "rgb(var(--color-info))",
  "#E0A526",
  "#5FB3C2",
  "#F08A6E",
];

// Fixed pseudo-random confetti layout (deterministic, so no hydration or render churn).
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const distance = 120 + ((i * 37) % 90);
  return {
    color: COLORS[i % COLORS.length],
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance - 40)}px`,
    rot: `${(i * 67) % 360}deg`,
    delay: `${(i % 7) * 40}ms`,
  };
});

interface QuestCelebrationProps {
  quest: QuestDefinition;
  onClose: () => void;
}

/** Popup shown after a quest reward is claimed on-chain. */
export function QuestCelebration({ quest: rawQuest, onClose }: QuestCelebrationProps) {
  const { locale, t } = useI18n();
  const quest = localizeQuest(rawQuest, locale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const badge = quest.rewardBadgeType !== undefined ? getBadgeType(quest.rewardBadgeType) : undefined;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-celebration-title"
        onClick={(e) => e.stopPropagation()}
        className="quest-pop relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface p-6 text-center shadow-overlay"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="quest-confetti"
              style={
                {
                  background: c.color,
                  animationDelay: c.delay,
                  "--dx": c.dx,
                  "--dy": c.dy,
                  "--rot": c.rot,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <AppIcon name={quest.icon} className="h-10 w-10" />
            <span aria-hidden className="absolute -right-1 -top-1 text-2xl">
              🎉
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent-strong">{t("Hoàn thành nhiệm vụ!", "Quest complete!")}</p>
          <h2 id="quest-celebration-title" className="mt-1 text-xl font-bold text-text">
            {quest.title}
          </h2>

          <ul className="mt-4 space-y-2 text-sm">
            {quest.ecoReward > 0 && (
              <li className="rounded-md bg-accent-soft px-3 py-2 font-semibold tabular-nums text-accent-strong">
                🌱 +{quest.ecoReward} ECO {t("đã vào ví của bạn", "added to your wallet")}
              </li>
            )}
            {badge && (
              <li className="flex items-center justify-center gap-2 rounded-md bg-accent-soft px-3 py-2 font-semibold text-accent-strong">
                <AppIcon name={badge.icon} className="h-4 w-4 shrink-0" />
                {t(`Huy hiệu ${badge.label} đã về ví của bạn`, `${badge.labelEn} badge has been minted`)}
              </li>
            )}
          </ul>

          <div className="mt-5 flex gap-2">
            <Link
              href="/dashboard"
              className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-border-strong py-3 text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary-soft"
            >
              {t("Xem Dashboard", "View Dashboard")}
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-md bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              {t("Tuyệt vời!", "Great!")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
