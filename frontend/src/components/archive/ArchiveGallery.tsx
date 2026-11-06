"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { sampleHeritageItems, type HeritageItem } from "@/data/heritage";
import { markHeritageViewed } from "@/lib/quests";

// Lazy load Three.js component để không làm nặng First Contentful Paint
const DigitalArchive360 = dynamic(
  () => import("./DigitalArchive360").then((mod) => mod.DigitalArchive360),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm">Đang tải không gian 3D Three.js...</p>
      </div>
    ),
  }
);

export { sampleHeritageItems, type HeritageItem } from "@/data/heritage";

const ALL_CATEGORIES = "Tất cả";
type CategoryFilter = HeritageItem["category"] | typeof ALL_CATEGORIES;
const categories: CategoryFilter[] = [ALL_CATEGORIES, "Kiến trúc", "Thiên nhiên", "Làng nghề"];

export function ArchiveGallery() {
  const [activeItem, setActiveItem] = useState<HeritageItem | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>(ALL_CATEGORIES);

  const filteredItems =
    filter === ALL_CATEGORIES
      ? sampleHeritageItems
      : sampleHeritageItems.filter((item) => item.category === filter);

  return (
    <div className="space-y-6">
      {/* If viewing a 360 item */}
      {activeItem ? (
        <DigitalArchive360
          imageUrl={activeItem.panoramaUrl}
          title={activeItem.title}
          location={activeItem.location}
          hotspots={activeItem.hotspots}
          onBack={() => setActiveItem(null)}
        />
      ) : (
        <>
          {/* Header & filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🏛️ Bảo Tồn Di Sản Số Hóa 360°
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Khám phá không gian thực tế ảo tương tác, lưu trữ vĩnh viễn trên
                hệ thống phi tập trung.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    filter === cat
                      ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/50"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setActiveItem(item);
                  markHeritageViewed(item.id);
                }}
                aria-label={`Mở không gian 360° của ${item.title}`}
                className="group text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/40 flex flex-col"
              >
                {/* Visual Preview */}
                <div className="h-48 w-full bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 relative overflow-hidden flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  
                  {/* 360 Badge */}
                  <div className="absolute top-3 right-3 bg-emerald-500/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <span>360° VR</span>
                  </div>

                  {/* Category tag */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-md">
                    {item.category}
                  </div>

                  <div className="text-center z-10 space-y-1">
                    <span className="text-4xl group-hover:scale-110 transition-transform inline-block">
                      {item.category === "Kiến trúc"
                        ? "⛩️"
                        : item.category === "Thiên nhiên"
                          ? "🏞️"
                          : "🏺"}
                    </span>
                    <p className="text-xs text-emerald-300 font-mono">
                      [Chạm để mở không gian 360°]
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-white font-bold text-base group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-emerald-400/90 text-xs mt-0.5 flex items-center gap-1">
                      <span>📍</span> {item.location}
                    </p>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {item.hotspots.length} điểm chú giải
                    </span>
                    <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Xem di sản ➔
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ArchiveGallery;
