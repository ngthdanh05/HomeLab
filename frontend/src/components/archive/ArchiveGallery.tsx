"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Amphora, ArrowRight, Landmark, MapPin, Waves } from "lucide-react";
import { getHeritageItems, type HeritageItem } from "@/data/heritage";
import { markHeritageViewed } from "@/lib/quests";
import { useI18n } from "@/providers/LocaleProvider";

function ViewerLoading() {
  const { t } = useI18n();
  return (
    <div className="w-full h-[600px] bg-bg rounded-lg border border-border flex flex-col items-center justify-center text-text-muted gap-3">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm">{t("Đang tải không gian 360°...", "Loading the 360° space...")}</p>
    </div>
  );
}

// Lazy load Three.js component để không làm nặng First Contentful Paint
const DigitalArchive360 = dynamic(
  () => import("./DigitalArchive360").then((mod) => mod.DigitalArchive360),
  {
    ssr: false,
    loading: () => <ViewerLoading />,
  }
);

export { sampleHeritageItems, type HeritageItem } from "@/data/heritage";

const ALL_CATEGORIES = "Tất cả";
type CategoryFilter = HeritageItem["category"] | typeof ALL_CATEGORIES;
const categories: CategoryFilter[] = [ALL_CATEGORIES, "Kiến trúc", "Thiên nhiên", "Làng nghề"];
const CATEGORY_LABELS_EN: Record<CategoryFilter, string> = {
  [ALL_CATEGORIES]: "All",
  "Kiến trúc": "Architecture",
  "Thiên nhiên": "Nature",
  "Làng nghề": "Craft village",
};

export function ArchiveGallery() {
  const { locale, t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>(ALL_CATEGORIES);

  const items = getHeritageItems(locale);
  const activeItem = items.find((item) => item.id === activeId) ?? null;
  const filteredItems = filter === ALL_CATEGORIES ? items : items.filter((item) => item.category === filter);

  return (
    <div className="space-y-6">
      {/* If viewing a 360 item */}
      {activeItem ? (
        <DigitalArchive360
          imageUrl={activeItem.panoramaUrl}
          title={activeItem.title}
          location={activeItem.location}
          hotspots={activeItem.hotspots}
          onBack={() => setActiveId(null)}
        />
      ) : (
        <>
          {/* Header & filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-lg border border-border">
            <div>
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <Landmark aria-hidden className="h-5 w-5 shrink-0 text-primary" />
                {t("Bộ sưu tập 360°", "360° collection")}
              </h2>
              <p className="text-text-muted text-sm mt-1">
                {t(
                  "Khám phá không gian thực tế ảo tương tác với ảnh minh hoạ, kèm chú giải về từng di sản.",
                  "Explore interactive virtual spaces with illustrative images and notes on each heritage site.",
                )}
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={filter === cat}
                  onClick={() => setFilter(cat)}
                  className={`min-h-11 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                    filter === cat
                      ? "bg-primary text-white"
                      : "bg-bg text-text-muted hover:bg-primary-soft hover:text-text"
                  }`}
                >
                  {t(cat, CATEGORY_LABELS_EN[cat])}
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
                  setActiveId(item.id);
                  markHeritageViewed(item.id);
                }}
                aria-label={t(`Mở không gian 360° của ${item.title}`, `Open the 360° view of ${item.title}`)}
                className="group text-left bg-surface border border-border hover:border-primary/30 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* Visual Preview */}
                <div className="h-48 w-full bg-primary-soft relative overflow-hidden flex items-center justify-center p-4">
                  {/* 360 Badge */}
                  <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <span>360° VR</span>
                  </div>

                  {/* Category tag */}
                  <div className="absolute top-3 left-3 bg-surface border border-border text-primary text-xs font-medium px-2 py-1 rounded-sm">
                    {t(item.category, CATEGORY_LABELS_EN[item.category])}
                  </div>

                  <div className="text-center z-10 space-y-2">
                    {(() => {
                      const CategoryIcon =
                        item.category === "Kiến trúc" ? Landmark : item.category === "Thiên nhiên" ? Waves : Amphora;
                      return (
                        <CategoryIcon
                          aria-hidden
                          className="mx-auto h-10 w-10 text-primary group-hover:scale-110 transition-transform"
                        />
                      );
                    })()}
                    <p className="text-xs text-primary">
                      {t("[Chạm để mở không gian 360°]", "[Tap to open the 360° view]")}
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-text font-bold text-base group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-primary text-xs mt-1 flex items-center gap-1">
                      <MapPin aria-hidden className="h-4 w-4 shrink-0" /> {item.location}
                    </p>
                    <p className="text-text-muted text-xs mt-2 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted">
                      {item.hotspots.length} {t("điểm chú giải", "notes")}
                    </span>
                    <span className="text-primary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      {t("Xem di sản", "View heritage")}
                      <ArrowRight aria-hidden className="h-4 w-4" />
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
