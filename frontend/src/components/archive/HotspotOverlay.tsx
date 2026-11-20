"use client";

import React from "react";
import { MapPin, X } from "lucide-react";
import type { HotspotData } from "@/lib/three-utils";
import { useI18n } from "@/providers/LocaleProvider";

interface HotspotOverlayProps {
  hotspot: HotspotData | null;
  onClose: () => void;
}

export function HotspotOverlay({ hotspot, onClose }: HotspotOverlayProps) {
  const { t } = useI18n();
  if (!hotspot) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-text/50 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="bg-surface border border-primary/30 rounded-lg p-6 max-w-md w-full shadow-overlay relative text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-text-muted hover:text-text bg-bg hover:bg-primary-soft w-11 h-11 rounded-full flex items-center justify-center transition-colors"
          aria-label={t("Đóng popup", "Close popup")}
        >
          <X aria-hidden className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-3 pr-10">
          <span aria-hidden className="w-3 h-3 rounded-full bg-primary animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary-soft px-3 py-1 rounded-full border border-primary/30">
            {t("Điểm Di Sản Số Hóa 360°", "360° Digital Heritage Point")}
          </span>
        </div>

        <h3 className="text-xl font-bold text-text mb-2">{hotspot.title}</h3>
        <p className="text-text-muted text-sm leading-relaxed mb-6">
          {hotspot.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-text-muted tabular-nums">
            <MapPin aria-hidden className="h-4 w-4 shrink-0" />
            {t("Tọa độ 3D", "3D position")}: Φ {hotspot.position.phi.toFixed(2)} rad | Θ{" "}
            {hotspot.position.theta.toFixed(2)} rad
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md transition-colors"
          >
            {t("Tiếp tục khám phá", "Keep exploring")}
          </button>
        </div>
      </div>
    </div>
  );
}
