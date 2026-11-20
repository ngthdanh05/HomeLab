"use client";

import React, { useEffect, useState } from "react";
import {
  Anchor,
  Ban,
  Bot,
  CalendarDays,
  Drama,
  Fish,
  Hand,
  Leaf,
  ListChecks,
  MessageCircle,
  Recycle,
  ShieldCheck,
  Sparkle,
  SunMedium,
  Turtle,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { FilterChips, cn } from "@/components/ui";
import { getCulturalDestinations } from "@/data/culturalData";
import { useI18n } from "@/providers/LocaleProvider";
import { CultureAIGuide } from "./CultureAIGuide";
import { DosDonts } from "./DosDonts";
import { LanguageLearning } from "./LanguageLearning";

/** Bộ quy tắc ứng xử với biển và rạn san hô (áp dụng cho mọi điểm đến ven biển). */
const MARINE_CODE: { Icon: LucideIcon; vi: string; en: string }[] = [
  {
    Icon: Hand,
    vi: "Không chạm, đứng hay giẫm lên san hô. Khi lặn, giữ thăng bằng và khoảng cách để chân vịt không quệt vào rạn.",
    en: "Never touch, stand on or step on coral. When diving, control your buoyancy and keep your fins clear of the reef.",
  },
  {
    Icon: SunMedium,
    vi: "Dùng kem chống nắng không chứa oxybenzone, octinoxate hoặc mặc áo chống nắng khi xuống nước.",
    en: "Use sunscreen without oxybenzone or octinoxate, or wear a rash guard in the water.",
  },
  {
    Icon: Ban,
    vi: "Không bẻ, mua hay mang về san hô, vỏ ốc quý, sản phẩm từ đồi mồi. Nhiều loài được pháp luật bảo vệ.",
    en: "Do not break, buy or take home coral, rare shells or tortoiseshell products. Many species are protected by law.",
  },
  {
    Icon: Turtle,
    vi: "Không cho cá ăn, không đuổi theo hay chạm vào rùa biển. Quan sát từ xa và nhường đường cho chúng.",
    en: "Do not feed fish or chase or touch sea turtles. Watch from a distance and give them way.",
  },
  {
    Icon: Recycle,
    vi: "Mang bình nước, túi vải và mang rác của mình về đất liền. Cù Lao Chàm đã nói không với túi nilon từ năm 2009.",
    en: "Bring a bottle and a cloth bag, and carry your rubbish back to the mainland. Cu Lao Cham has banned plastic bags since 2009.",
  },
  {
    Icon: Anchor,
    vi: "Chọn tàu buộc vào phao neo cố định thay vì thả neo, đi cùng hướng dẫn viên người địa phương.",
    en: "Choose boats that tie up to fixed mooring buoys instead of anchoring, and go with a local guide.",
  },
  {
    Icon: Fish,
    vi: "Không gọi hải sản còn non hoặc đang mùa sinh sản. Hỏi ngư dân loài nào đang vào mùa.",
    en: "Skip juvenile seafood and species in their breeding season. Ask fishers what is in season.",
  },
];

type SectionId = "dos-donts" | "conservation" | "food" | "customs" | "language" | "ask-ai";

const SECTIONS: { id: SectionId; label: string; labelEn: string; Icon: LucideIcon }[] = [
  { id: "dos-donts", label: "Nên / Không nên", labelEn: "Dos & don'ts", Icon: ListChecks },
  { id: "conservation", label: "Quy tắc bảo tồn biển", labelEn: "Marine conservation code", Icon: ShieldCheck },
  { id: "food", label: "Ẩm thực", labelEn: "Food", Icon: UtensilsCrossed },
  { id: "customs", label: "Phong tục", labelEn: "Customs", Icon: Drama },
  { id: "language", label: "Ngôn ngữ", labelEn: "Language", Icon: MessageCircle },
  { id: "ask-ai", label: "Hỏi AI", labelEn: "Ask AI", Icon: Bot },
];

function Section({ id, title, Icon, children }: { id: SectionId; title: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <h2 id={`${id}-title`} className="mb-4 flex items-center gap-2 text-xl font-bold text-text">
        <Icon aria-hidden className="h-5 w-5 shrink-0 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Trang Văn hoá một tầng điều hướng: chọn điểm đến, nội dung cuộn liên tục trên một trang
 * với mục lục (dính bên trái trên desktop, hàng ngang trên mobile).
 */
export function CultureGuideSection({ initialDestinationId }: { initialDestinationId?: string }) {
  const { locale, t } = useI18n();
  const destinations = getCulturalDestinations(locale);
  const [selectedId, setSelectedId] = useState(
    destinations.some((d) => d.id === initialDestinationId) ? initialDestinationId! : destinations[0].id,
  );
  const [activeSection, setActiveSection] = useState<SectionId>("dos-donts");
  const dest = destinations.find((d) => d.id === selectedId) ?? destinations[0];

  const selectDestination = (id: string) => {
    setSelectedId(id);
    // Giữ điểm đến trong URL để chia sẻ được link (không tạo mục lịch sử mới).
    const url = new URL(window.location.href);
    url.searchParams.set("d", id);
    window.history.replaceState(null, "", url);
  };

  // Đánh dấu mục đang đọc trong mục lục.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId);
      },
      { rootMargin: "-96px 0px -60% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const toc = (
    <ul className="flex gap-2 lg:flex-col lg:gap-1">
      {SECTIONS.map(({ id, label, labelEn, Icon }) => (
        <li key={id} className="shrink-0">
          <a
            href={`#${id}`}
            aria-current={activeSection === id ? "location" : undefined}
            className={cn(
              "inline-flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              activeSection === id ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-primary-soft hover:text-text",
            )}
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            {t<string>(label, labelEn)}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <FilterChips
        label={t("Chọn điểm đến", "Choose a destination")}
        items={destinations.map((d) => ({ id: d.id, label: d.name }))}
        value={dest.id}
        onChange={selectDestination}
      />

      <div className="rounded-lg border border-primary/30 bg-primary-soft p-5 sm:p-6">
        <p className="text-sm font-medium text-primary">{dest.region}</p>
        <p className="mt-1 text-2xl font-bold text-text">{dest.name}</p>
        <p className="mt-2 max-w-3xl text-text-muted">{dest.description}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-text">
          <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="font-semibold">{t("Thời điểm đẹp nhất", "Best time")}: </span>
            {dest.bestTime}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label={t("Mục lục", "Contents")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible">
          <div className="lg:sticky lg:top-24">{toc}</div>
        </nav>

        <div className="min-w-0 space-y-6">
          <Section id="dos-donts" title={t("Nên / Không nên", "Dos & don'ts")} Icon={ListChecks}>
            <DosDonts dos={dest.dos} donts={dest.donts} />
          </Section>

          <Section id="conservation" title={t("Quy tắc bảo tồn biển", "Marine conservation code")} Icon={ShieldCheck}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {MARINE_CODE.map(({ Icon, vi, en }) => (
                <li key={en} className="flex items-start gap-3 rounded-md border border-border bg-bg p-4 text-sm text-text">
                  <Icon aria-hidden className="mt-px h-5 w-5 shrink-0 text-primary" />
                  {t(vi, en)}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-primary-soft p-4 text-sm text-primary">
              <Leaf aria-hidden className="mt-px h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">{t("Mẹo giảm carbon", "Carbon-saving tip")}: </span>
                {dest.carbonTip}
              </span>
            </p>
          </Section>

          <Section id="food" title={t("Ẩm thực địa phương", "Local food")} Icon={UtensilsCrossed}>
            <ul className="flex flex-wrap gap-2">
              {dest.localFood.map((food) => (
                <li key={food} className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-text">
                  {food}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="customs" title={t("Phong tục & truyền thống", "Customs & traditions")} Icon={Drama}>
            <ul className="space-y-2">
              {dest.customs.map((custom) => (
                <li key={custom} className="flex items-start gap-2 text-sm text-text-muted">
                  <Sparkle aria-hidden className="mt-1 h-3 w-3 shrink-0 text-primary" />
                  {custom}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="language" title={t("Học vài câu địa phương", "Learn a few local phrases")} Icon={MessageCircle}>
            {/* key: đổi điểm đến thì bộ thẻ học bắt đầu lại từ đầu */}
            <LanguageLearning key={dest.id} destination={dest} />
          </Section>

          <Section id="ask-ai" title={t("Hỏi AI về một điểm đến khác", "Ask AI about another destination")} Icon={Bot}>
            <CultureAIGuide />
          </Section>
        </div>
      </div>
    </div>
  );
}
