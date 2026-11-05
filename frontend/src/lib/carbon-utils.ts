// Carbon footprint helpers for the Carbon Tracker (framework-free, unit-tested with Node).

import { ValidationError } from "./ai-validation.ts";
import { encodeDataJsonUri } from "./marketplace.ts";

/**
 * Average emission factors in kg CO₂e per passenger-km (per vehicle-km for car
 * and motorbike, which are then shared between passengers). Rounded from the
 * UK Government GHG conversion factors (DEFRA 2023); real values vary with the
 * vehicle, load and route, so results are estimates.
 */
export const TRANSPORT_MODES = [
  { id: "plane", label: "Máy bay (nội địa)", icon: "✈️", factor: 0.246, perVehicle: false },
  { id: "car", label: "Ô tô (xăng)", icon: "🚗", factor: 0.171, perVehicle: true },
  { id: "motorbike", label: "Xe máy", icon: "🛵", factor: 0.114, perVehicle: true },
  { id: "bus", label: "Xe khách / xe buýt", icon: "🚌", factor: 0.027, perVehicle: false },
  { id: "train", label: "Tàu hoả", icon: "🚆", factor: 0.035, perVehicle: false },
  { id: "boat", label: "Tàu cao tốc / phà", icon: "⛴️", factor: 0.115, perVehicle: false },
  { id: "bicycle", label: "Xe đạp / đi bộ", icon: "🚲", factor: 0, perVehicle: false },
] as const;

export type TransportModeId = (typeof TRANSPORT_MODES)[number]["id"];

export function getTransportMode(id: string) {
  return TRANSPORT_MODES.find((m) => m.id === id);
}

export const CARBON_LIMITS = {
  maxLegs: 10,
  maxKmPerLeg: 20_000,
  maxPassengers: 9,
  descriptionLength: 1000,
  /** Matches CarbonOffset.MAX_OFFSET_GRAMS (100 tonnes). */
  maxOffsetKg: 100_000,
} as const;

export interface TripLeg {
  mode: TransportModeId;
  km: number;
  /** People sharing the vehicle (car / motorbike only). */
  passengers?: number;
}

export interface CarbonBreakdownItem {
  activity: string;
  kgCO2: number;
}

export type CarbonLevel = "low" | "medium" | "high";

/** Trip totals (kg CO₂) under which a trip counts as low / medium emission. */
export const LEVEL_THRESHOLDS = { low: 50, medium: 200 } as const;

/** Upper end of the meter scale (kg CO₂). */
export const METER_MAX_KG = 400;

export const LEVEL_INFO: Record<CarbonLevel, { label: string; color: string; hint: string }> = {
  low: {
    label: "Thấp",
    color: "#10b981",
    hint: "Hành trình rất xanh — tiếp tục ưu tiên tàu, xe khách và xe đạp nhé!",
  },
  medium: {
    label: "Trung bình",
    color: "#f59e0b",
    hint: "Có thể giảm bằng cách thay một chặng bay/ô tô bằng tàu hoặc xe khách.",
  },
  high: {
    label: "Cao",
    color: "#ef4444",
    hint: "Phát thải lớn, chủ yếu từ máy bay/ô tô. Hãy cân nhắc bù đắp carbon.",
  },
};

export function getCarbonLevel(kg: number): CarbonLevel {
  if (kg < LEVEL_THRESHOLDS.low) return "low";
  if (kg < LEVEL_THRESHOLDS.medium) return "medium";
  return "high";
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/** kg CO₂ of one leg for one traveller. Returns 0 for invalid input. */
export function calculateLegKg(leg: TripLeg): number {
  const mode = getTransportMode(leg.mode);
  if (!mode || !Number.isFinite(leg.km) || leg.km <= 0) return 0;
  const km = Math.min(leg.km, CARBON_LIMITS.maxKmPerLeg);
  const passengers = mode.perVehicle
    ? Math.min(CARBON_LIMITS.maxPassengers, Math.max(1, Math.floor(leg.passengers ?? 1)))
    : 1;
  return (km * mode.factor) / passengers;
}

/** Totals for a list of legs, with a per-leg breakdown (kg rounded to 0.01). */
export function calculateTrip(legs: TripLeg[]): { totalKg: number; breakdown: CarbonBreakdownItem[] } {
  const breakdown = legs.slice(0, CARBON_LIMITS.maxLegs).map((leg) => {
    const mode = getTransportMode(leg.mode);
    return {
      activity: `${mode?.icon ?? ""} ${mode?.label ?? leg.mode} · ${leg.km} km`.trim(),
      kgCO2: round(calculateLegKg(leg)),
    };
  });
  const totalKg = round(legs.slice(0, CARBON_LIMITS.maxLegs).reduce((sum, leg) => sum + calculateLegKg(leg), 0));
  return { totalKg, breakdown };
}

/** Grams for CarbonOffset.offset(), rounded up so the offset never under-covers. */
export function kgToGrams(kg: number): bigint {
  if (!Number.isFinite(kg) || kg <= 0) return 0n;
  return BigInt(Math.ceil(round(kg * 1000, 6)));
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString("vi-VN", { maximumFractionDigits: kg < 10 ? 2 : 1 })} kg CO₂`;
}

// ───────────────────────────── AI estimate ─────────────────────────────

/** 400-level input error; the AI routes map ValidationError to HTTP 400. */
export class CarbonValidationError extends ValidationError {}

export function parseCarbonEstimateRequest(body: unknown): { description: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CarbonValidationError("Invalid request body");
  }
  const raw = (body as Record<string, unknown>).description;
  if (typeof raw !== "string" || raw.trim().length < 10) {
    throw new CarbonValidationError("Hãy mô tả hành trình (ít nhất 10 ký tự).");
  }
  if (raw.length > CARBON_LIMITS.descriptionLength) {
    throw new CarbonValidationError(`Mô tả tối đa ${CARBON_LIMITS.descriptionLength} ký tự.`);
  }
  // Same hardening as the other AI routes: no control chars, no """ delimiter breaking.
  const description = raw
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/"{3,}/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return { description };
}

export interface CarbonEstimate {
  totalKgCO2: number;
  breakdown: CarbonBreakdownItem[];
  level: CarbonLevel;
  offsetSuggestions: string[];
}

const clampKg = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(CARBON_LIMITS.maxOffsetKg, Math.max(0, n)) : 0;
};
const shortText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Validates the AI's JSON. The total is the sum of the breakdown when one is
 * given (the model's own total is not trusted), and the level is recomputed.
 */
export function normalizeCarbonEstimate(raw: unknown): CarbonEstimate {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("AI response is not an object");
  }
  const data = raw as Record<string, unknown>;
  const breakdown = (Array.isArray(data.breakdown) ? data.breakdown : [])
    .map((item) => {
      const entry = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
      return { activity: shortText(entry.activity, 160), kgCO2: round(clampKg(entry.kgCO2)) };
    })
    .filter((item) => item.activity)
    .slice(0, 20);

  const totalKgCO2 = round(
    breakdown.length > 0
      ? Math.min(CARBON_LIMITS.maxOffsetKg, breakdown.reduce((sum, i) => sum + i.kgCO2, 0))
      : clampKg(data.totalKgCO2),
  );

  return {
    totalKgCO2,
    breakdown,
    level: getCarbonLevel(totalKgCO2),
    offsetSuggestions: (Array.isArray(data.offsetSuggestions) ? data.offsetSuggestions : [])
      .map((s) => shortText(s, 300))
      .filter(Boolean)
      .slice(0, 5),
  };
}

/** Factor table given to the AI so its estimates match the calculator. */
export function describeEmissionFactors(): string {
  return TRANSPORT_MODES.map(
    (m) => `- ${m.label}: ${m.factor} kg CO₂/${m.perVehicle ? "xe" : "khách"}-km`,
  ).join("\n");
}

// ───────────────────────────── Badge metadata ─────────────────────────────

/** CarbonOffset.MAX_METADATA_URI_LENGTH */
export const MAX_METADATA_URI_LENGTH = 2048;

/**
 * Inline (data: URI) metadata for the ZERO_CARBON badge, in the shape the
 * dashboard reads (`action`, `carbonOffset`, `location`). Stays under the
 * contract's 2 KB limit by trimming the description.
 */
export function buildOffsetMetadataUri(input: {
  kg: number;
  summary?: string;
  location?: string;
  timestamp?: number;
}): string {
  const kgText = formatKg(input.kg);
  let description = (input.summary ?? "").trim().slice(0, 400);
  const build = () =>
    encodeDataJsonUri({
      name: `Zero Carbon · ${kgText}`,
      description:
        description || `Đã bù đắp ${kgText} cho chuyến đi; phí bù đắp được chuyển vào Quỹ Cộng đồng.`,
      action: `Bù đắp ${kgText}`,
      carbonOffset: kgText,
      ...(input.location ? { location: input.location.trim().slice(0, 100) } : {}),
      timestamp: input.timestamp ?? Math.floor(Date.now() / 1000),
    });
  let uri = build();
  while (uri.length > MAX_METADATA_URI_LENGTH && description.length > 0) {
    description = description.slice(0, Math.floor(description.length / 2));
    uri = build();
  }
  return uri;
}

/** Mirrors CarbonOffset.quoteOffset(): fee in wei for `grams`, rounded up. */
export function quoteOffsetWei(grams: bigint, pricePerKgWei: bigint): bigint {
  return (grams * pricePerKgWei + 999n) / 1000n;
}
