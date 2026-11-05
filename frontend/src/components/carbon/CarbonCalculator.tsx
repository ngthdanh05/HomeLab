"use client";

import React, { useState } from "react";
import {
  CARBON_LIMITS,
  TRANSPORT_MODES,
  calculateTrip,
  getTransportMode,
  type CarbonBreakdownItem,
  type CarbonEstimate,
  type TripLeg,
} from "@/lib/carbon-utils";

export interface TripResult {
  totalKg: number;
  breakdown: CarbonBreakdownItem[];
  suggestions: string[];
  source: "calculator" | "ai";
  /** Short text of the trip, stored in the badge metadata. */
  summary: string;
}

export const DEFAULT_LEGS: TripLeg[] = [
  { mode: "plane", km: 630 },
  { mode: "bus", km: 30 },
];

export function resultFromLegs(legs: TripLeg[]): TripResult {
  const { totalKg, breakdown } = calculateTrip(legs);
  return {
    totalKg,
    breakdown,
    suggestions: [],
    source: "calculator",
    summary: legs
      .filter((l) => l.km > 0)
      .map((l) => `${getTransportMode(l.mode)?.label ?? l.mode} ${l.km} km`)
      .join(", "),
  };
}

type Tab = "calculator" | "ai";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function CarbonCalculator({ onResult }: { onResult: (result: TripResult) => void }) {
  const [tab, setTab] = useState<Tab>("calculator");
  const [legs, setLegs] = useState<TripLeg[]>(DEFAULT_LEGS);
  const [description, setDescription] = useState("");
  const [aiState, setAiState] = useState<{ loading: boolean; error?: string; estimate?: CarbonEstimate }>({
    loading: false,
  });

  const updateLegs = (next: TripLeg[]) => {
    setLegs(next);
    onResult(resultFromLegs(next));
  };
  const updateLeg = (index: number, patch: Partial<TripLeg>) =>
    updateLegs(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === "calculator") onResult(resultFromLegs(legs));
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
      if (!response.ok) throw new Error(data.error || "Không thể ước tính carbon. Vui lòng thử lại.");
      setAiState({ loading: false, estimate: data });
      onResult(resultFromEstimate(data, description));
    } catch (error) {
      setAiState({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể ước tính carbon.",
      });
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6" aria-labelledby="calc-title">
      <h2 id="calc-title" className="text-lg font-bold text-white">
        🧮 Tính phát thải chuyến đi
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1" role="tablist" aria-label="Cách tính">
        {(
          [
            { id: "calculator", label: "Theo phương tiện" },
            { id: "ai", label: "✨ Mô tả cho AI" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
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
                className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
              >
                <legend className="sr-only">Chặng {index + 1}</legend>
                <label className="col-span-2 text-xs text-slate-400 sm:col-span-1">
                  Phương tiện
                  <select
                    value={leg.mode}
                    onChange={(e) => updateLeg(index, { mode: e.target.value as TripLeg["mode"] })}
                    className={`${inputClass} mt-1`}
                  >
                    {TRANSPORT_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-400">
                  Quãng đường (km)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={CARBON_LIMITS.maxKmPerLeg}
                    value={Number.isFinite(leg.km) ? leg.km : ""}
                    onChange={(e) =>
                      updateLeg(index, {
                        km: Math.min(CARBON_LIMITS.maxKmPerLeg, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className={`text-xs ${mode?.perVehicle ? "text-slate-400" : "text-slate-600"}`}>
                  Số người đi chung
                  <input
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
                    className={`${inputClass} mt-1 disabled:opacity-40`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => updateLegs(legs.filter((_, i) => i !== index))}
                  disabled={legs.length === 1}
                  aria-label={`Xoá chặng ${index + 1}`}
                  className="col-span-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:border-red-700 hover:text-red-300 disabled:opacity-30 sm:col-span-1"
                >
                  ✕
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={() => updateLegs([...legs, { mode: "bus", km: 0 }])}
            disabled={legs.length >= CARBON_LIMITS.maxLegs}
            className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-sm text-slate-400 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-40"
          >
            + Thêm chặng
          </button>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Hệ số phát thải trung bình (kg CO₂/km) tham khảo bộ hệ số DEFRA 2023; ô tô và xe máy được chia
            cho số người đi chung. Kết quả là ước tính.
          </p>
        </div>
      ) : (
        <form onSubmit={estimate} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-400">
            Mô tả hành trình của bạn
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CARBON_LIMITS.descriptionLength}
              rows={5}
              placeholder="Ví dụ: Bay từ Hà Nội vào Đà Nẵng, đi xe khách lên Hội An, ở homestay 3 đêm, thuê xe máy đi Mỹ Sơn khoảng 40 km rồi bay về."
              className={`${inputClass} mt-1 resize-y`}
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              {description.length}/{CARBON_LIMITS.descriptionLength}
            </span>
            <button
              type="submit"
              disabled={aiState.loading || description.trim().length < 10}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {aiState.loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
              )}
              {aiState.loading ? "AI đang ước tính…" : "Ước tính bằng AI"}
            </button>
          </div>
          {aiState.error && (
            <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
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
