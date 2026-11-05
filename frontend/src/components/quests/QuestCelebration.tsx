"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import type { QuestDefinition } from "@/data/quests";
import { getBadgeType } from "@/lib/dashboard";

const COLORS = ["#10b981", "#f59e0b", "#38bdf8", "#a78bfa", "#f472b6", "#facc15"];

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
export function QuestCelebration({ quest, onClose }: QuestCelebrationProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-celebration-title"
        onClick={(e) => e.stopPropagation()}
        className="quest-pop relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-700/60 bg-slate-900 p-6 text-center shadow-2xl shadow-emerald-950"
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
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-4xl shadow-lg shadow-emerald-900">
            {quest.icon}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-emerald-300">Quest hoàn thành!</p>
          <h2 id="quest-celebration-title" className="mt-1 text-xl font-extrabold text-white">
            {quest.title}
          </h2>

          <ul className="mt-4 space-y-2 text-sm">
            {quest.ecoReward > 0 && (
              <li className="rounded-xl bg-emerald-500/15 px-3 py-2 font-semibold text-emerald-300">
                🌱 +{quest.ecoReward} ECO đã vào ví của bạn
              </li>
            )}
            {badge && (
              <li className="rounded-xl bg-violet-500/15 px-3 py-2 font-semibold text-violet-300">
                {badge.icon} Badge {badge.label} đã được mint
              </li>
            )}
          </ul>

          <div className="mt-5 flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:border-emerald-600"
            >
              Xem Dashboard
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Tuyệt vời!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
