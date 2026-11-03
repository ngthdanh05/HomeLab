// Pure validation/normalization helpers for the AI API routes.
// Kept free of framework imports so they can be unit-tested with plain Node.
import type {
  ActivityType,
  CarbonPreference,
  ChatContext,
  CultureGuide,
  Itinerary,
  ItineraryActivity,
  ItineraryDay,
} from "../types/ai";

export const LIMITS = {
  messageLength: 2000,
  destinationLength: 100,
  contextLength: 500,
  interestLength: 50,
  maxInterests: 10,
  minDays: 1,
  maxDays: 14,
  listItems: 20,
} as const;

export class ValidationError extends Error {}

const CARBON_PREFERENCES: readonly CarbonPreference[] = ["low", "medium", "high"];
const ACTIVITY_TYPES: readonly ActivityType[] = [
  "transport",
  "accommodation",
  "food",
  "activity",
  "culture",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Collapses whitespace and strips control characters so user input cannot
// smuggle fake prompt sections (e.g. "\n\nSYSTEM:") into the prompt, and
// collapses triple quotes so it cannot close the """...""" data delimiters.
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/"{3,}/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return sanitizeText(value, maxLength);
}

function parseInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, LIMITS.interestLength))
    .filter(Boolean)
    .slice(0, LIMITS.maxInterests);
}

export function parseChatRequest(body: unknown): {
  message: string;
  context: ChatContext;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const message = requireText(body.message, "message", LIMITS.messageLength);
  const rawContext = isRecord(body.context) ? body.context : {};
  const carbonPreference = CARBON_PREFERENCES.find(
    (p) => p === rawContext.carbonPreference,
  );

  return {
    message,
    context: {
      destination:
        sanitizeText(rawContext.destination, LIMITS.destinationLength) || undefined,
      interests: parseInterests(rawContext.interests),
      carbonPreference,
    },
  };
}

export function parseItineraryRequest(body: unknown): {
  destination: string;
  days: number;
  interests: string[];
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  const destination = requireText(
    body.destination,
    "destination",
    LIMITS.destinationLength,
  );
  const days = Number(body.days);
  if (!Number.isInteger(days) || days < LIMITS.minDays || days > LIMITS.maxDays) {
    throw new ValidationError(
      `days must be an integer between ${LIMITS.minDays} and ${LIMITS.maxDays}`,
    );
  }

  return { destination, days, interests: parseInterests(body.interests) };
}

export function parseCultureGuideRequest(body: unknown): {
  destination: string;
  context: string;
} {
  if (!isRecord(body)) throw new ValidationError("Invalid request body");

  return {
    destination: requireText(
      body.destination,
      "destination",
      LIMITS.destinationLength,
    ),
    context: sanitizeText(body.context, LIMITS.contextLength),
  };
}

// Model output is untrusted: extract the first JSON object and coerce it into
// the expected shape so the UI never crashes on missing/invalid fields.
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI response does not contain a JSON object");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function toNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toString(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toString(item))
    .filter(Boolean)
    .slice(0, LIMITS.listItems);
}

function normalizeActivity(value: unknown): ItineraryActivity | null {
  if (!isRecord(value)) return null;
  const activity = toString(value.activity);
  if (!activity) return null;
  return {
    time: toString(value.time, 20),
    activity,
    location: toString(value.location, 200),
    carbonKg: toNumber(value.carbonKg),
    tip: toString(value.tip),
    type: ACTIVITY_TYPES.find((t) => t === value.type) ?? "activity",
  };
}

function normalizeDay(value: unknown, index: number): ItineraryDay | null {
  if (!isRecord(value)) return null;
  const activities = Array.isArray(value.activities)
    ? value.activities
        .map(normalizeActivity)
        .filter((a): a is ItineraryActivity => a !== null)
    : [];
  return {
    day: toNumber(value.day, 1, LIMITS.maxDays) || index + 1,
    activities,
    totalCarbonKg: toNumber(value.totalCarbonKg),
    ecoScore: Math.round(toNumber(value.ecoScore, 0, 100)),
  };
}

export function normalizeItinerary(
  raw: unknown,
  fallback: { destination: string; days: number },
): Itinerary {
  if (!isRecord(raw)) throw new Error("AI itinerary is not an object");

  const itinerary = Array.isArray(raw.itinerary)
    ? raw.itinerary
        .map(normalizeDay)
        .filter((d): d is ItineraryDay => d !== null)
    : [];
  if (itinerary.length === 0) throw new Error("AI itinerary has no days");

  return {
    destination: toString(raw.destination, 100) || fallback.destination,
    days: fallback.days,
    totalCarbonKg: toNumber(raw.totalCarbonKg),
    ecoScore: Math.round(toNumber(raw.ecoScore, 0, 100)),
    summary: toString(raw.summary, 1000),
    itinerary,
    packingTips: toStringList(raw.packingTips),
    carbonOffsetSuggestion: toString(raw.carbonOffsetSuggestion),
  };
}

export function normalizeCultureGuide(raw: unknown): CultureGuide {
  if (!isRecord(raw)) throw new Error("AI culture guide is not an object");

  const phrases = Array.isArray(raw.phrases)
    ? raw.phrases
        .filter(isRecord)
        .map((p) => ({
          phrase: toString(p.phrase, 200),
          meaning: toString(p.meaning, 200),
          pronunciation: toString(p.pronunciation, 200),
        }))
        .filter((p) => p.phrase && p.meaning)
        .slice(0, LIMITS.listItems)
    : [];

  return {
    dos: toStringList(raw.dos),
    donts: toStringList(raw.donts),
    phrases,
    customs: toStringList(raw.customs),
    localFood: toStringList(raw.localFood),
  };
}
