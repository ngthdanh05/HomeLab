"use client";

import React, { useState } from "react";
import { Calculator, Plus, Sparkles, Trash2 } from "lucide-react";
import { Input, Select, Spinner, Textarea } from "@/components/ui";
import {
  CARBON_LIMITS,
  TRANSPORT_MODES,
  calculateTrip,
  getTransportMode,
  type CarbonBreakdownItem,
  type CarbonEstimate,
  type TripLeg,
} from "@/lib/carbon-utils";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

export interface TripResult {
  totalKg: number;
  breakdown: CarbonBreakdownItem[];
  suggestions: string[];
  source: "calculator" | "ai";
  /** Short text of the trip, stored in the badge metadata. */
  summary: string;
  /** Set for calculator results, so their labels can follow the language. */
  legs?: TripLeg[];
}

/** Starts empty: results only describe "your trip" once the user has entered a distance. */
export const DEFAULT_LEGS: TripLeg[] = [{ mode: "plane", km: 0 }];

export function resultFromLegs(legs: TripLeg[], locale: Locale = "vi"): TripResult {
  // Legs without a distance yet are left out of the breakdown.
  const { totalKg, breakdown } = calculateTrip(
    legs.filter((l) => l.km > 0),
    locale,
  );
  return {
    totalKg,
    breakdown,
    suggestions: [],
    source: "calculator",
    legs,
    summary: legs
      .filter((l) => l.km > 0)
      .map((l) => {
        const mode = getTransportMode(l.mode);
        return `${mode ? (locale === "en" ? mode.labelEn : mode.label) : l.mode} ${l.km} km`;
      })
      .join(", "),
  };
}

type Tab = "calculator" | "ai";

// Nhãn của ô nhập; ô nhập dùng Input/Select (cao 44px, viền border-strong) để thẳng hàng.
const labelClass = "flex flex-col gap-1 text-sm font-medium text-text";

export function CarbonCalculator({ onResult }: { onResult: (result: TripResult) => void }) {
  const { locale, t } = useI18n();
  const [tab, setTab] = useState<Tab>("calculator");
  const [legs, setLegs] = useState<TripLeg[]>(DEFAULT_LEGS);
  const [description, setDescription] = useState("");
  const [aiState, setAiState] = useState<{ loading: boolean; error?: string; estimate?: CarbonEstimate }>({
    loading: false,
  });

  const updateLegs = (next: TripLeg[]) => {
    setLegs(next);
    onResult(resultFromLegs(next, locale));
  };
  const updateLeg = (index: number, patch: Partial<TripLeg>) =>
    updateLegs(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === "calculator") onResult(resultFromLegs(legs, locale));
    else if (aiState.estimate) onResult(resultFromEstimate(aiState.estimate, description));
  };

  const estimate = async (event: React.FormEvent) => {
    event.preventDefault();
    setAiState({ loading: true });
    try {
      const response = await fetch("/api/carbon/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await response.json().catch(() => ({}))) as CarbonEstimate & { error?: string };
      if (!response.ok) throw new Error(data.error || t("Không thể ước tính carbon. Vui lòng thử lại.", "Could not estimate carbon. Please try again."));
      setAiState({ loading: false, estimate: data });
      onResult(resultFromEstimate(data, description));
    } catch (error) {
      setAiState({
        loading: false,
        error: error instanceof Error ? error.message : t("Không thể ước tính carbon.", "Could not estimate carbon."),
      });
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="calc-title">
      <h2 id="calc-title" className="flex items-center gap-2 text-lg font-bold text-text">
        <Calculator aria-hidden className="h-5 w-5 text-primary" />
        {t("Tính phát thải chuyến đi", "Calculate trip emissions")}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-bg p-1" role="tablist" aria-label={t("Cách tính", "Calculation method")}>
        {(
          [
            { id: "calculator", label: t("Theo phương tiện", "By transport"), icon: null },
            { id: "ai", label: t("Mô tả cho AI", "Describe to AI"), icon: <Sparkles aria-hidden className="h-4 w-4 shrink-0" /> },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => switchTab(option.id)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
              tab === option.id ? "bg-primary text-white" : "text-text-muted hover:bg-surface hover:text-text"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      {tab === "calculator" ? (
        <div className="mt-4 space-y-3">
          {legs.map((leg, index) => {
            const mode = getTransportMode(leg.mode);
            return (
              <fieldset
                key={index}
                className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-bg p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
              >
                <legend className="sr-only">{t("Chặng", "Leg")} {index + 1}</legend>
                <label className={`col-span-2 sm:col-span-1 ${labelClass}`}>
                  {t("Phương tiện", "Transport")}
                  <Select
                    value={leg.mode}
                    onChange={(e) => updateLeg(index, { mode: e.target.value as TripLeg["mode"] })}
                  >
                    {TRANSPORT_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {t<string>(m.label, m.labelEn)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className={labelClass}>
                  {t("Quãng đường (km)", "Distance (km)")}
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={CARBON_LIMITS.maxKmPerLeg}
                    value={Number.isFinite(leg.km) && leg.km > 0 ? leg.km : ""}
                    placeholder={t("Ví dụ: 630", "e.g. 630")}
                    onChange={(e) =>
                      updateLeg(index, {
                        km: Math.min(CARBON_LIMITS.maxKmPerLeg, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="tabular-nums"
                  />
                </label>
                <label className={`${labelClass} ${mode?.perVehicle ? "" : "text-text-muted"}`}>
                  {t("Số người đi chung", "People sharing")}
                  <Input
                    type="number"
                    min={1}
                    max={CARBON_LIMITS.maxPassengers}
                    disabled={!mode?.perVehicle}
                    value={mode?.perVehicle ? (leg.passengers ?? 1) : 1}
                    onChange={(e) =>
                      updateLeg(index, {
                        passengers: Math.min(CARBON_LIMITS.maxPassengers, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="tabular-nums"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => updateLegs(legs.filter((_, i) => i !== index))}
                  disabled={legs.length === 1}
                  aria-label={t(`Xoá chặng ${index + 1}`, `Remove leg ${index + 1}`)}
                  className="col-span-2 inline-flex h-11 items-center justify-center rounded-md border border-border-strong bg-surface text-text-muted hover:border-danger hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:bg-surface disabled:hover:text-text-muted sm:col-span-1 sm:w-11"
                >
                  <Trash2 aria-hidden className="h-5 w-5" />
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={() => updateLegs([...legs, { mode: "bus", km: 0 }])}
            disabled={legs.length >= CARBON_LIMITS.maxLegs}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong py-2 text-sm font-medium text-text-muted hover:border-primary hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t("Thêm chặng", "Add leg")}
          </button>
          <p className="text-xs leading-relaxed text-text-muted">
            {t(
              "Hệ số phát thải trung bình (kg CO₂/km) tham khảo bộ hệ số DEFRA 2023; ô tô và xe máy được chia cho số người đi chung. Kết quả là ước tính.",
              "Average emission factors (kg CO₂/km) are based on the DEFRA 2023 factors; cars and motorbikes are divided by the number of people sharing. Results are estimates.",
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={estimate} className="mt-4 space-y-3">
          <label className={labelClass}>
            {t("Mô tả hành trình của bạn", "Describe your trip")}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CARBON_LIMITS.descriptionLength}
              rows={5}
              placeholder={t(
                "Ví dụ: Bay từ Hà Nội vào Đà Nẵng, đi xe khách lên Hội An, ở homestay 3 đêm, thuê xe máy đi Mỹ Sơn khoảng 40 km rồi bay về.",
                "Example: Fly from Hanoi to Da Nang, take a coach to Hoi An, stay 3 nights in a homestay, rent a motorbike to My Son (about 40 km), then fly home.",
              )}
              className="resize-y"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-text-muted">
              {description.length}/{CARBON_LIMITS.descriptionLength}
            </span>
            <button
              type="submit"
              disabled={aiState.loading || description.trim().length < 10}
              className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
            >
              {aiState.loading && <Spinner />}
              {aiState.loading ? t("AI đang ước tính…", "AI is estimating…") : t("Ước tính bằng AI", "Estimate with AI")}
            </button>
          </div>
          {aiState.error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {aiState.error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

function resultFromEstimate(estimate: CarbonEstimate, description: string): TripResult {
  return {
    totalKg: estimate.totalKgCO2,
    breakdown: estimate.breakdown,
    suggestions: estimate.offsetSuggestions,
    source: "ai",
    summary: description.trim().slice(0, 300),
  };
}
