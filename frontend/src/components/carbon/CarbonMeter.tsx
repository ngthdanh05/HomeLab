"use client";

import React from "react";
import {
  LEVEL_INFO,
  LEVEL_THRESHOLDS,
  METER_MAX_KG,
  formatKg,
  getCarbonLevel,
} from "@/lib/carbon-utils";
import { useI18n } from "@/providers/LocaleProvider";

const CX = 120;
const CY = 120;
const R = 95;

/** Point on the gauge for a kg value (0 → left end, METER_MAX_KG → right end). */
function point(kg: number, radius = R) {
  const ratio = Math.min(1, Math.max(0, kg / METER_MAX_KG));
  const angle = Math.PI * (1 - ratio);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function arc(fromKg: number, toKg: number) {
  const a = point(fromKg);
  const b = point(toKg);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

const ZONES = [
  { from: 0, to: LEVEL_THRESHOLDS.low, level: "low" as const },
  { from: LEVEL_THRESHOLDS.low, to: LEVEL_THRESHOLDS.medium, level: "medium" as const },
  { from: LEVEL_THRESHOLDS.medium, to: METER_MAX_KG, level: "high" as const },
];

/** Semicircular gauge of a trip's emissions with low / medium / high zones. */
export function CarbonMeter({ kg }: { kg: number }) {
  const { locale, t } = useI18n();
  const level = getCarbonLevel(kg);
  const info = LEVEL_INFO[level];
  const levelLabel = t(info.label, info.labelEn);
  const tip = point(kg, R - 18);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 240 140"
        className="w-full max-w-xs"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={METER_MAX_KG}
        aria-valuenow={Math.round(Math.min(kg, METER_MAX_KG))}
        aria-valuetext={t(`${formatKg(kg, locale)}, mức ${levelLabel}`, `${formatKg(kg, locale)}, ${levelLabel} level`)}
        aria-label={t("Mức phát thải carbon", "Carbon emission level")}
      >
        {ZONES.map((zone) => (
          <path
            key={zone.level}
            d={arc(zone.from, zone.to)}
            fill="none"
            stroke={LEVEL_INFO[zone.level].color}
            strokeOpacity={zone.level === level ? 1 : 0.3}
            strokeWidth={18}
          />
        ))}
        <line
          x1={CX}
          y1={CY}
          x2={tip.x}
          y2={tip.y}
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          className="text-white transition-all duration-700 ease-out motion-reduce:transition-none"
        />
        <circle cx={CX} cy={CY} r={7} className="fill-white" />
        <text x={22} y={138} className="fill-slate-500 text-[10px]">0</text>
        <text x={218} y={138} textAnchor="end" className="fill-slate-500 text-[10px]">
          {METER_MAX_KG}+
        </text>
      </svg>
      <p className="-mt-1 font-mono text-3xl font-extrabold text-white">{formatKg(kg, locale)}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color: info.color }}>
        {t("Mức phát thải", "Emission level")}: {levelLabel}
      </p>
      <p className="mt-1 max-w-xs text-center text-xs text-slate-400">{t(info.hint, info.hintEn)}</p>
    </div>
  );
}
