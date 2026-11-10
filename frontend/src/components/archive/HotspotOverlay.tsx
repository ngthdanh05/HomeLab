"use client";

import React from "react";
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
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          aria-label={t("Đóng popup", "Close popup")}
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
            {t("Điểm Di Sản Số Hóa 360°", "360° Digital Heritage Point")}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{hotspot.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          {hotspot.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            📍 {t("Tọa độ 3D", "3D position")}: Φ {hotspot.position.phi.toFixed(2)} rad | Θ{" "}
            {hotspot.position.theta.toFixed(2)} rad
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {t("Tiếp tục khám phá", "Keep exploring")}
          </button>
        </div>
      </div>
    </div>
  );
}
