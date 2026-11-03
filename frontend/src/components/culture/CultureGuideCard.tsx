"use client";

import React from "react";
import { CulturalDestination } from "@/data/culturalData";
import { DosDonts } from "./DosDonts";

interface CultureGuideCardProps {
  destination: CulturalDestination;
}

export function CultureGuideCard({ destination }: CultureGuideCardProps) {
  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-white text-xl font-bold">{destination.name}</h2>
            <p className="text-emerald-300 text-sm">{destination.region}</p>
            <p className="text-slate-300 text-sm mt-1">{destination.description}</p>
          </div>
          <div className="text-right text-sm text-emerald-300">
            <p>🗓️ {destination.bestTime}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Dos & Don'ts */}
        <DosDonts dos={destination.dos} donts={destination.donts} />

        {/* Local Food */}
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            🍜 Ẩm thực địa phương
          </h3>
          <div className="flex flex-wrap gap-2">
            {destination.localFood.map((food, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-amber-900/40 border border-amber-700/50 rounded-full text-amber-300 text-sm"
              >
                {food}
              </span>
            ))}
          </div>
        </div>

        {/* Customs */}
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            🎭 Phong tục & Truyền thống
          </h3>
          <ul className="space-y-2">
            {destination.customs.map((custom, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-slate-300 text-sm"
              >
                <span className="text-teal-500 mt-0.5 flex-shrink-0">✦</span>
                {custom}
              </li>
            ))}
          </ul>
        </div>

        {/* Carbon Tip */}
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <p className="text-emerald-400 text-sm">
            <span className="font-semibold">🌿 Mẹo giảm carbon: </span>
            {destination.carbonTip}
          </p>
        </div>
      </div>
    </div>
  );
}
