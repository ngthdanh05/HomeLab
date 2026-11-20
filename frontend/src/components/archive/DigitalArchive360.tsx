"use client";

import React, { useRef, useState } from "react";
import { ArrowLeft, Rotate3d, Sparkles } from "lucide-react";
import { useThreeScene } from "@/hooks/useThreeScene";
import type { HotspotData } from "@/lib/three-utils";
import { useI18n } from "@/providers/LocaleProvider";
import { HotspotOverlay } from "./HotspotOverlay";

export interface DigitalArchive360Props {
  imageUrl: string;
  title: string;
  location: string;
  hotspots?: HotspotData[];
  onBack?: () => void;
}

// Stable default so the Three.js scene isn't rebuilt on every render.
const NO_HOTSPOTS: HotspotData[] = [];

export function DigitalArchive360({
  imageUrl,
  title,
  location,
  hotspots = NO_HOTSPOTS,
  onBack,
}: DigitalArchive360Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(
    null
  );
  // Looked up by id so an open popup follows a language change.
  const shownHotspot = selectedHotspot
    ? (hotspots.find((h) => h.id === selectedHotspot.id) ?? selectedHotspot)
    : null;

  const { isLoading } = useThreeScene(containerRef, {
    imageUrl,
    hotspots,
    onHotspotClick: setSelectedHotspot,
  });

  return (
    <div className="relative w-full h-[600px] md:h-[680px] bg-text rounded-lg overflow-hidden border border-border select-none">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label={t(`Không gian 360° của ${title}`, `360° view of ${title}`)}
        role="img"
      />

      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg text-text-muted">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">{t("Đang tải ảnh 360°...", "Loading 360° image...")}</p>
        </div>
      )}

      {/* Top Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-surface backdrop-blur-md px-4 py-3 rounded-md border border-border pointer-events-auto">
          <div className="flex items-center gap-2">
            <span aria-hidden className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <h3 className="text-text font-bold text-base md:text-lg">
              {title}
            </h3>
          </div>
          <p className="text-primary text-xs font-medium">{location}</p>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2 bg-surface hover:bg-primary-soft text-text rounded-md border border-border text-xs font-medium transition-colors shadow-overlay"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {t("Quay lại danh mục", "Back to list")}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls / Help Overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col md:flex-row items-center justify-between gap-2 pointer-events-none">
        <div className="bg-surface backdrop-blur-md px-4 py-2 rounded-sm border border-border text-xs text-text-muted pointer-events-auto flex items-center gap-2">
          <Rotate3d aria-hidden className="h-4 w-4 shrink-0" />
          <span>{t("Kéo chuột hoặc vuốt tay để xoay 360°", "Drag or swipe to rotate 360°")}</span>
          <span className="text-text-muted hidden sm:inline">|</span>
          <span className="text-primary hidden sm:inline-flex items-center gap-1">
            <Sparkles aria-hidden className="h-4 w-4 shrink-0" />
            {t("Nhấp vào các điểm màu san hô để xem thuyết minh di sản", "Click the coral points for heritage notes")}
          </span>
        </div>

        <div className="bg-surface backdrop-blur-md px-3 py-2 rounded-sm border border-border text-xs text-text-muted pointer-events-auto">
          {hotspots.length} {t("điểm thuyết minh", "guide points")}
        </div>
      </div>

      {/* Hotspot detail popup */}
      <HotspotOverlay
        hotspot={shownHotspot}
        onClose={() => setSelectedHotspot(null)}
      />
    </div>
  );
}

export default DigitalArchive360;
