"use client";

import React, { useRef, useState } from "react";
import { useThreeScene } from "@/hooks/useThreeScene";
import type { HotspotData } from "@/lib/three-utils";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(
    null
  );

  const { isLoading } = useThreeScene(containerRef, {
    imageUrl,
    hotspots,
    onHotspotClick: setSelectedHotspot,
  });

  return (
    <div className="relative w-full h-[600px] md:h-[680px] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label={`Không gian 360° của ${title}`}
        role="img"
      />

      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-slate-400">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm">Đang tải ảnh 360°...</p>
        </div>
      )}

      {/* Top Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-white font-bold text-base md:text-lg">
              {title}
            </h3>
          </div>
          <p className="text-emerald-400 text-xs font-medium">{location}</p>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-slate-800/85 hover:bg-slate-700 text-white rounded-xl backdrop-blur-md border border-slate-700 text-xs font-medium transition-colors shadow-lg"
            >
              ← Quay lại danh mục
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls / Help Overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col md:flex-row items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 pointer-events-auto flex items-center gap-2">
          <span>🔄 Kéo chuột hoặc vuốt tay để xoay 360°</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-emerald-400 hidden sm:inline">
            ✨ Nhấp vào các điểm ngọc lục bảo để xem thuyết minh di sản
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 pointer-events-auto">
          {hotspots.length} điểm thuyết minh
        </div>
      </div>

      {/* Hotspot detail popup */}
      <HotspotOverlay
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
      />
    </div>
  );
}

export default DigitalArchive360;
