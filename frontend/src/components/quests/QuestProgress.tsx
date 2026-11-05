"use client";

import React from "react";

interface ProgressBarProps {
  /** 0–1 */
  ratio: number;
  label: string;
  tone?: "emerald" | "amber" | "slate";
}

const TONES = {
  emerald: "from-emerald-500 to-teal-400",
  amber: "from-amber-500 to-yellow-300",
  slate: "from-slate-600 to-slate-500",
} as const;

/** Accessible progress bar used by quest cards and the overall summary. */
export function QuestProgressBar({ ratio, label, tone = "emerald" }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${TONES[tone]} transition-[width] duration-700 ease-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface QuestSummaryProps {
  completed: number;
  total: number;
  ecoEarned: number;
  ecoAvailable: number;
}

/** Overall quest completion: X / N quests, ECO earned from quests. */
export function QuestSummary({ completed, total, ecoEarned, ecoAvailable }: QuestSummaryProps) {
  return (
    <section
      aria-labelledby="quest-summary-title"
      className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-3 sm:p-6"
    >
      <div className="sm:col-span-2">
        <h2 id="quest-summary-title" className="text-sm font-semibold text-slate-300">
          🎯 Tiến độ Eco Quest
        </h2>
        <p className="mt-1 text-2xl font-extrabold text-white">
          {completed}
          <span className="text-base font-medium text-slate-400"> / {total} quest hoàn thành</span>
        </p>
        <div className="mt-3">
          <QuestProgressBar ratio={total ? completed / total : 0} label="Tỉ lệ quest đã hoàn thành" />
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">ECO từ quest</p>
        <p className="mt-1 font-mono text-2xl font-bold text-white">
          {ecoEarned.toLocaleString("vi-VN")}
          <span className="text-sm font-medium text-slate-400"> / {ecoAvailable.toLocaleString("vi-VN")} ECO</span>
        </p>
      </div>
    </section>
  );
}
