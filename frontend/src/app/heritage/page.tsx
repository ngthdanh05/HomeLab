"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Rotate3d } from "lucide-react";
import { ExploreNav } from "@/components/layout/ExploreNav";
import { PageHeader, Skeleton } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";

// Bộ sưu tập 360° (và trình xem nặng bên trong) chỉ tải khi vào trang này.
const ArchiveGallery = dynamic(() => import("@/components/archive/ArchiveGallery").then((m) => m.ArchiveGallery), {
  loading: () => <Skeleton className="h-96 w-full" />,
});

export default function HeritagePage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        eyebrow={t("Khám phá", "Explore")}
        icon={Rotate3d}
        title={t("Bảo tàng San hô & Di sản biển 360°", "Coral Museum & 360° Ocean Heritage")}
        description={t(
          "Chạm vào một di sản để mở không gian 360°, kéo để nhìn quanh và chọn các điểm sáng để đọc câu chuyện bảo tồn phía sau.",
          "Tap a site to open its 360° space, drag to look around and select the markers to read the conservation story behind it.",
        )}
      />
      <ExploreNav />
      <ArchiveGallery />
    </>
  );
}
