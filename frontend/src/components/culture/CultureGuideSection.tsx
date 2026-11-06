"use client";

import React, { useState } from "react";
import { culturalDestinations } from "@/data/culturalData";
import { CultureGuideCard } from "./CultureGuideCard";
import { LanguageLearning } from "./LanguageLearning";
import { DosDonts } from "./DosDonts";
import type { CultureGuide } from "@/types/ai";

type Tab = "guide" | "language" | "ai";

export function CultureGuideSection() {
  const [selectedId, setSelectedId] = useState(culturalDestinations[0].id);
  const [activeTab, setActiveTab] = useState<Tab>("guide");
  const [aiDestination, setAiDestination] = useState("");
  const [aiGuide, setAiGuide] = useState<CultureGuide | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedDest =
    culturalDestinations.find((d) => d.id === selectedId) ?? culturalDestinations[0];

  const handleAIGuide = async () => {
    if (!aiDestination.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/ai/culture-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: aiDestination }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Không thể tạo hướng dẫn văn hóa.");
      }
      setAiGuide(data as CultureGuide);
    } catch (err) {
      setAiGuide(null);
      setAiError(
        err instanceof Error ? err.message : "Không thể tạo hướng dẫn văn hóa.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Destination selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {culturalDestinations.map((dest) => (
          <button
            key={dest.id}
            onClick={() => setSelectedId(dest.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedId === dest.id
                ? "bg-emerald-700 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {dest.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit">
        {(["guide", "language", "ai"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab === "guide" && "📖 Hướng dẫn"}
            {tab === "language" && "💬 Ngôn ngữ"}
            {tab === "ai" && "🤖 AI Guide"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "guide" && (
        <CultureGuideCard destination={selectedDest} />
      )}

      {activeTab === "language" && (
        // key resets flash-card progress when switching destination
        <LanguageLearning key={selectedDest.id} destination={selectedDest} />
      )}

      {activeTab === "ai" && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
          <h3 className="text-white font-bold">🤖 AI Culture Guide</h3>
          <p className="text-slate-400 text-sm">
            Nhập bất kỳ điểm đến nào ở Việt Nam để nhận hướng dẫn văn hóa từ AI
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              aria-label="Điểm đến cho AI Culture Guide"
              maxLength={100}
              value={aiDestination}
              onChange={(e) => setAiDestination(e.target.value)}
              placeholder="VD: Huế, Đà Lạt, Hà Nội..."
              className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && handleAIGuide()}
            />
            <button
              onClick={handleAIGuide}
              disabled={!aiDestination.trim() || aiLoading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl transition-colors"
            >
              {aiLoading ? "Đang tạo..." : "Tạo Guide"}
            </button>
          </div>

          {aiError && (
            <div
              role="alert"
              className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-400 text-sm"
            >
              ⚠️ {aiError}
            </div>
          )}

          {aiGuide && (
            <div className="space-y-4 animate-fade-in">
              <DosDonts dos={aiGuide.dos} donts={aiGuide.donts} />

              {aiGuide.phrases && aiGuide.phrases.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">💬 Câu giao tiếp cơ bản</h4>
                  <div className="space-y-2">
                    {aiGuide.phrases.map((p, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 bg-slate-700 rounded-lg px-4 py-2">
                        <span className="text-white font-medium">{p.phrase}</span>
                        <span className="text-slate-400 text-sm">{p.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiGuide.customs.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">🎭 Phong tục & Truyền thống</h4>
                  <ul className="space-y-1">
                    {aiGuide.customs.map((custom, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                        <span className="text-teal-500 mt-0.5 flex-shrink-0">✦</span>
                        {custom}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiGuide.localFood && aiGuide.localFood.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">🍜 Ẩm thực địa phương</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiGuide.localFood.map((food, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-900/40 border border-amber-700/40 rounded-full text-amber-300 text-sm">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
