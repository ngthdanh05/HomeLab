"use client";

import React from "react";
import { Target } from "lucide-react";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

interface ProgressBarProps {
  /** 0–1 */
  ratio: number;
  label: string;
  tone?: "primary" | "accent" | "neutral";
}

const TONES = {
  primary: "bg-primary",
  accent: "bg-accent",
  neutral: "bg-border-strong",
} as const;

/** Accessible progress bar used by quest cards and the overall summary. */
export function QuestProgressBar({ ratio, label, tone = "primary" }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-border"
    >
      <div
        className={`h-full rounded-full ${TONES[tone]} transition-[width] duration-700 ease-out`}
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
  const { locale, t } = useI18n();
  return (
    <section
      aria-labelledby="quest-summary-title"
      className="grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-3 sm:p-6"
    >
      <div className="sm:col-span-2">
        <h2 id="quest-summary-title" className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <Target aria-hidden className="h-4 w-4 text-primary" />
          {t("Tiến độ Nhiệm vụ bảo tồn", "Conservation Quest progress")}
        </h2>
        <p className="mt-1 text-2xl font-bold tabular-nums text-text">
          {completed}
          <span className="text-base font-medium text-text-muted"> / {total} {t("nhiệm vụ hoàn thành", "quests completed")}</span>
        </p>
        <div className="mt-3">
          <QuestProgressBar ratio={total ? completed / total : 0} label={t("Tỉ lệ nhiệm vụ đã hoàn thành", "Share of quests completed")} />
        </div>
      </div>
      <div className="rounded-lg border border-accent/30 bg-accent-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">{t("ECO từ nhiệm vụ", "ECO from quests")}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-text">
          {ecoEarned.toLocaleString(intlLocale(locale))}
          <span className="text-sm font-medium text-text-muted"> / {ecoAvailable.toLocaleString(intlLocale(locale))} ECO</span>
        </p>
      </div>
    </section>
  );
}
