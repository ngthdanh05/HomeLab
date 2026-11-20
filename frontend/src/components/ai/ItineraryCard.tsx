"use client";

import React from "react";
import {
  Backpack,
  BedDouble,
  Bus,
  Landmark,
  Leaf,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType, Itinerary } from "@/types/ai";
import { useI18n } from "@/providers/LocaleProvider";

interface ItineraryCardProps {
  itinerary: Itinerary;
}

const activityTypeIcons: Record<ActivityType, LucideIcon> = {
  transport: Bus,
  accommodation: BedDouble,
  food: UtensilsCrossed,
  activity: Target,
  culture: Landmark,
};

const ecoScoreColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-warning";
  return "text-danger";
};

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { t } = useI18n();
  return (
    <div className="bg-bg border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-text">
            <MapIcon aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            {t(
              `Lịch trình ${itinerary.days} ngày tại ${itinerary.destination}`,
              `${itinerary.days}-day itinerary in ${itinerary.destination}`,
            )}
          </h2>
          <p className="text-text-muted mt-1 text-sm">{itinerary.summary}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${ecoScoreColor(itinerary.ecoScore)}`}>
            {itinerary.ecoScore}
          </div>
          <div className="text-text-muted text-xs">Eco Score</div>
        </div>
      </div>

      {/* Carbon Summary */}
      <div className="bg-surface border border-border rounded-md p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <p className="text-text-muted text-sm">{t("Tổng phát thải ước tính", "Estimated total emissions")}</p>
          <p className="flex items-center gap-2 text-text font-bold text-lg tabular-nums">
            <Leaf aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            {itinerary.totalCarbonKg.toFixed(1)} kg CO₂
          </p>
        </div>
        <p className="flex items-start gap-2 sm:max-w-[50%] text-sm text-text-muted">
          <Lightbulb aria-hidden className="mt-1 h-4 w-4 shrink-0 text-warning" />
          <span>{itinerary.carbonOffsetSuggestion}</span>
        </p>
      </div>

      {/* Daily Itinerary */}
      <div className="space-y-4">
        {itinerary.itinerary.map((day) => (
          <div key={day.day} className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="bg-primary-soft px-4 py-2 flex justify-between items-center">
              <h3 className="font-semibold text-text">{t("Ngày", "Day")} {day.day}</h3>
              <div className="flex items-center gap-3 text-sm tabular-nums">
                <span className="flex items-center gap-1 text-text-muted">
                  <Leaf aria-hidden className="h-4 w-4 text-primary" />
                  {day.totalCarbonKg.toFixed(1)} kg CO₂
                </span>
                <span className={ecoScoreColor(day.ecoScore)}>
                  Eco: {day.ecoScore}
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {day.activities.map((activity, idx) => {
                const ActivityIcon = activityTypeIcons[activity.type] ?? MapPin;
                return (
                  <div key={idx} className="px-4 py-3 flex gap-3">
                    <div className="text-text-muted text-sm w-14 flex-shrink-0 pt-1 tabular-nums">
                      {activity.time}
                    </div>
                    <ActivityIcon aria-hidden className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium">{activity.activity}</p>
                      <p className="text-text-muted text-xs">{activity.location}</p>
                      {activity.tip && (
                        <p className="flex items-start gap-1 text-primary text-xs mt-1">
                          <Lightbulb aria-hidden className="h-4 w-4 shrink-0" />
                          <span>{activity.tip}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-text-muted text-xs flex-shrink-0 text-right tabular-nums">
                      {activity.carbonKg > 0 && (
                        <span>{activity.carbonKg.toFixed(1)} kg CO₂</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Packing Tips */}
      {itinerary.packingTips && itinerary.packingTips.length > 0 && (
        <div className="bg-primary-soft border border-primary/30 rounded-md p-4">
          <h4 className="flex items-center gap-2 text-primary font-semibold mb-2">
            <Backpack aria-hidden className="h-5 w-5 shrink-0" />
            {t("Mẹo đóng gói thân thiện môi trường", "Eco-friendly packing tips")}
          </h4>
          <ul className="space-y-1">
            {itinerary.packingTips.map((tip, idx) => (
              <li key={idx} className="text-text-muted text-sm flex gap-2">
                <span className="text-primary" aria-hidden>•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
