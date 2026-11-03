export type CarbonPreference = "low" | "medium" | "high";

export interface ChatContext {
  destination?: string;
  interests?: string[];
  carbonPreference?: CarbonPreference;
}

export type ActivityType =
  | "transport"
  | "accommodation"
  | "food"
  | "activity"
  | "culture";

export interface ItineraryActivity {
  time: string;
  activity: string;
  location: string;
  carbonKg: number;
  tip: string;
  type: ActivityType;
}

export interface ItineraryDay {
  day: number;
  activities: ItineraryActivity[];
  totalCarbonKg: number;
  ecoScore: number;
}

export interface Itinerary {
  destination: string;
  days: number;
  totalCarbonKg: number;
  ecoScore: number;
  summary: string;
  itinerary: ItineraryDay[];
  packingTips: string[];
  carbonOffsetSuggestion: string;
}

export interface Phrase {
  phrase: string;
  meaning: string;
  pronunciation: string;
}

export interface CultureGuide {
  dos: string[];
  donts: string[];
  phrases: Phrase[];
  customs: string[];
  localFood: string[];
}
