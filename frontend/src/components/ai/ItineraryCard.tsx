"use client";

import React from "react";
import { Itinerary } from "@/app/api/ai/itinerary/route";

interface ItineraryCardProps {
  itinerary: Itinerary;
}

const activityTypeIcons: Record<string, string> = {
  transport: "🚌",
  accommodation: "🏨",
  food: "🍜",
  activity: "🎯",
  culture: "🏛️",
};

const ecoScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">
            🗺️ Lịch trình {itinerary.days} ngày tại {itinerary.destination}
          </h2>
          <p className="text-slate-400 mt-1 text-sm">{itinerary.summary}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${ecoScoreColor(itinerary.ecoScore)}`}>
            {itinerary.ecoScore}
          </div>
          <div className="text-slate-400 text-xs">Eco Score</div>
        </div>
      </div>

      {/* Carbon Summary */}
      <div className="bg-slate-700 rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-slate-300 text-sm">Tổng phát thải ước tính</p>
          <p className="text-white font-bold text-lg">
            🌿 {itinerary.totalCarbonKg.toFixed(1)} kg CO₂
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p>💡 {itinerary.carbonOffsetSuggestion}</p>
        </div>
      </div>

      {/* Daily Itinerary */}
      <div className="space-y-4">
        {itinerary.itinerary.map((day) => (
          <div key={day.day} className="border border-slate-700 rounded-xl overflow-hidden">
            <div className="bg-slate-700 px-4 py-2 flex justify-between items-center">
              <h3 className="font-semibold text-white">Ngày {day.day}</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-300">
                  🌿 {day.totalCarbonKg.toFixed(1)} kg CO₂
                </span>
                <span className={ecoScoreColor(day.ecoScore)}>
                  Eco: {day.ecoScore}
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-700">
              {day.activities.map((activity, idx) => (
                <div key={idx} className="px-4 py-3 flex gap-3">
                  <div className="text-slate-400 text-sm w-14 flex-shrink-0 pt-0.5">
                    {activity.time}
                  </div>
                  <div className="text-lg flex-shrink-0">
                    {activityTypeIcons[activity.type] || "📍"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{activity.activity}</p>
                    <p className="text-slate-400 text-xs">{activity.location}</p>
                    {activity.tip && (
                      <p className="text-emerald-400 text-xs mt-1">💡 {activity.tip}</p>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs flex-shrink-0 text-right">
                    {activity.carbonKg > 0 && (
                      <span>{activity.carbonKg.toFixed(1)} kg CO₂</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Packing Tips */}
      {itinerary.packingTips && itinerary.packingTips.length > 0 && (
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <h4 className="text-emerald-400 font-semibold mb-2">🎒 Mẹo đóng gói thân thiện môi trường</h4>
          <ul className="space-y-1">
            {itinerary.packingTips.map((tip, idx) => (
              <li key={idx} className="text-slate-300 text-sm flex gap-2">
                <span className="text-emerald-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
