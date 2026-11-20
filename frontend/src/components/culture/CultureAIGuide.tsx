"use client";

import React, { useState } from "react";
import { CircleAlert, Drama, MessageCircle, Sparkle, UtensilsCrossed } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";
import type { CultureGuide } from "@/types/ai";
import { DosDonts } from "./DosDonts";

/** Hỏi AI hướng dẫn văn hoá cho một điểm đến bất kỳ (gọi /api/ai/culture-guide). */
export function CultureAIGuide() {
  const { t } = useI18n();
  const [aiDestination, setAiDestination] = useState("");
  const [aiGuide, setAiGuide] = useState<CultureGuide | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
        throw new Error(data?.error || t("Không thể tạo hướng dẫn văn hóa.", "Could not create the cultural guide."));
      }
      setAiGuide(data as CultureGuide);
    } catch (err) {
      setAiGuide(null);
      setAiError(
        err instanceof Error ? err.message : t("Không thể tạo hướng dẫn văn hóa.", "Could not create the cultural guide."),
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-text-muted text-sm">
        {t("Nhập một điểm đến ven biển hay hải đảo bất kỳ để nhận hướng dẫn văn hoá và ứng xử từ AI.", "Enter any coastal or island destination in Vietnam to get a culture and etiquette guide from AI.")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          aria-label={t("Điểm đến cho hướng dẫn văn hoá AI", "Destination for the AI Culture Guide")}
          maxLength={100}
          value={aiDestination}
          onChange={(e) => setAiDestination(e.target.value)}
          placeholder={t("VD: Côn Đảo, Lý Sơn, Quy Nhơn...", "E.g. Con Dao, Ly Son, Quy Nhon...")}
          className="min-h-11 flex-1 bg-surface border border-border-strong text-text rounded-sm px-4 py-2 focus:outline-none focus:border-primary"
          onKeyDown={(e) => e.key === "Enter" && handleAIGuide()}
        />
        <button
          onClick={handleAIGuide}
          disabled={!aiDestination.trim() || aiLoading}
          className="min-h-11 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-border disabled:text-text-muted text-white rounded-md transition-colors font-medium"
        >
          {aiLoading ? t("Đang tạo...", "Creating...") : t("Tạo hướng dẫn", "Create guide")}
        </button>
      </div>

      {aiError && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-danger-soft border border-danger/30 rounded-md p-3 text-danger text-sm"
        >
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0 mt-px" />
          <span>{aiError}</span>
        </div>
      )}

      {aiGuide && (
        <div className="space-y-4 animate-fade-in">
          <DosDonts dos={aiGuide.dos} donts={aiGuide.donts} />

          {aiGuide.phrases && aiGuide.phrases.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-text font-semibold mb-2">
                <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                {t("Câu giao tiếp cơ bản", "Basic phrases")}
              </h4>
              <div className="space-y-2">
                {aiGuide.phrases.map((p, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 bg-bg border border-border rounded-sm px-4 py-2">
                    <span className="text-text font-medium">{p.phrase}</span>
                    <span className="text-text-muted text-sm">{p.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiGuide.customs.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-text font-semibold mb-2">
                <Drama aria-hidden className="h-4 w-4 text-primary" />
                {t("Phong tục & Truyền thống", "Customs & Traditions")}
              </h4>
              <ul className="space-y-1">
                {aiGuide.customs.map((custom, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-text-muted text-sm">
                    <Sparkle aria-hidden className="mt-1 h-3 w-3 flex-shrink-0 text-primary" />
                    {custom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiGuide.localFood && aiGuide.localFood.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-text font-semibold mb-2">
                <UtensilsCrossed aria-hidden className="h-4 w-4 text-primary" />
                {t("Ẩm thực địa phương", "Local food")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {aiGuide.localFood.map((food, idx) => (
                  <span key={idx} className="px-3 py-1 bg-warning-soft border border-warning/30 rounded-full text-warning text-sm">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
