"use client";

import React, { useCallback } from "react";
import { Bot } from "lucide-react";
import { TravelAssistant } from "@/components/ai/TravelAssistant";
import { ExploreNav } from "@/components/layout/ExploreNav";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";

export function AssistantView({ initialQuestion }: { initialQuestion?: string }) {
  const { t } = useI18n();
  // Xoá ?q= sau khi gửi để tải lại trang không gửi lặp câu hỏi.
  const clearQuery = useCallback(() => window.history.replaceState(null, "", "/assistant"), []);

  return (
    <>
      <PageHeader
        eyebrow={t("Khám phá", "Explore")}
        icon={Bot}
        title={t("Trợ lý lặn & du lịch biển", "Diving & ocean travel assistant")}
        description={t(
          "Hỏi về mùa lặn, điểm ngắm san hô, làng chài và cách đi biển không để lại rác. Chuyển sang “Lịch trình” để nhận kế hoạch theo số ngày.",
          "Ask about dive seasons, reef spots, fishing villages and leave-no-trace beach trips. Switch to “Itinerary” for a day-by-day plan.",
        )}
      />
      <ExploreNav />
      <TravelAssistant initialQuestion={initialQuestion} onInitialQuestionSent={clearQuery} />
    </>
  );
}
