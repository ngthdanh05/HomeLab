"use client";

import React from "react";
import { BookOpenText } from "lucide-react";
import { CultureGuideSection } from "@/components/culture/CultureGuideSection";
import { ExploreNav } from "@/components/layout/ExploreNav";
import { PageHeader } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";

export function CultureView({ initialDestinationId }: { initialDestinationId?: string }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        eyebrow={t("Khám phá", "Explore")}
        icon={BookOpenText}
        title={t("Văn hoá làng chài & Quy tắc bảo tồn", "Fishing village culture & conservation code")}
        description={t(
          "Đến như một vị khách được chào đón: hiểu phong tục nơi mình ghé, ứng xử đúng với rạn san hô và để lại cho biển nhiều hơn những gì mình lấy đi.",
          "Arrive as a welcome guest: learn the local customs, treat the reef with care and leave the sea better than you found it.",
        )}
      />
      <ExploreNav />
      <CultureGuideSection initialDestinationId={initialDestinationId} />
    </>
  );
}
