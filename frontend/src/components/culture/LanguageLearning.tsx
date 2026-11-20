"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pointer, Volume2 } from "lucide-react";
import { CulturalDestination } from "@/data/culturalData";
import { useI18n } from "@/providers/LocaleProvider";

interface LanguageLearningProps {
  destination: CulturalDestination;
}

export function LanguageLearning({ destination }: LanguageLearningProps) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(flipTimerRef.current), []);

  const phrases = destination.phrases;
  if (phrases.length === 0) return null;
  const currentPhrase = phrases[Math.min(currentIndex, phrases.length - 1)];

  const handleFlip = () => setFlipped((prev) => !prev);

  // Wait for the card to flip back before swapping content, so the next
  // card's meaning is never briefly visible.
  const goTo = (getIndex: (prev: number) => number) => {
    setFlipped(false);
    clearTimeout(flipTimerRef.current);
    flipTimerRef.current = setTimeout(() => setCurrentIndex(getIndex), 200);
  };

  const handleNext = () => {
    setCompleted((prev) => new Set(prev).add(currentIndex));
    goTo((prev) => (prev + 1) % phrases.length);
  };

  const handlePrev = () => goTo((prev) => (prev - 1 + phrases.length) % phrases.length);

  const handleReset = () => {
    clearTimeout(flipTimerRef.current);
    setCurrentIndex(0);
    setFlipped(false);
    setCompleted(new Set());
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <p className="text-sm text-text-muted">
          {t("Lật thẻ để xem nghĩa và cách phát âm.", "Flip a card to see its meaning and pronunciation.")}
        </p>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="tabular-nums">
            {completed.size}/{phrases.length} {t("đã học", "learned")}
          </span>
          {completed.size > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="min-h-11 px-2 font-medium text-primary hover:text-primary-hover hover:underline transition-colors"
            >
              {t("Làm lại", "Start over")}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border rounded-full mb-6">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(completed.size / phrases.length) * 100}%` }}
        />
      </div>

      {/* Flash card */}
      <div
        role="button"
        tabIndex={0}
        className="relative h-48 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
        aria-label={flipped ? t("Xem lại cụm từ", "Back to the phrase") : t("Lật thẻ để xem nghĩa", "Flip the card to see the meaning")}
        aria-pressed={flipped}
        style={{ perspective: "1000px" }}
      >
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.5s",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front - Phrase */}
          <div
            className="absolute inset-0 bg-primary-soft rounded-lg flex flex-col items-center justify-center border border-primary/30"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-text mb-2 px-4 text-center">
              {currentPhrase.phrase}
            </p>
            <p className="text-primary text-sm">{t("Phát âm", "Pronunciation")}: {currentPhrase.pronunciation}</p>
            <p className="flex items-center gap-1 text-text-muted text-xs mt-4">
              {t("Nhấn để xem nghĩa", "Tap to see the meaning")}
              <Pointer aria-hidden className="h-4 w-4" />
            </p>
          </div>

          {/* Back - Meaning */}
          <div
            className="absolute inset-0 bg-bg rounded-lg flex flex-col items-center justify-center border border-border-strong"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-xl sm:text-2xl font-bold text-text mb-2 px-4 text-center">
              {currentPhrase.meaning}
            </p>
            <p className="text-text-muted text-sm italic">
              &quot;{currentPhrase.phrase}&quot;
            </p>
            <p className="flex items-center gap-1 text-text-muted text-xs mt-4">
              <Volume2 aria-hidden className="h-4 w-4" />
              {currentPhrase.pronunciation}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex min-h-11 items-center gap-2 px-4 py-2 bg-surface border border-border hover:bg-primary-soft text-text rounded-md transition-colors"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t("Trước", "Previous")}
        </button>

        <div className="flex gap-1">
          {phrases.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? "bg-primary"
                  : completed.has(idx)
                    ? "bg-primary"
                    : "bg-border-strong"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex min-h-11 items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors"
        >
          {t("Tiếp", "Next")}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {/* All phrases list */}
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-text-muted text-xs mb-3 uppercase tracking-wide">
          {t("Tất cả cụm từ", "All phrases")}
        </p>
        <div className="space-y-2">
          {phrases.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                clearTimeout(flipTimerRef.current);
                setCurrentIndex(idx);
                setFlipped(false);
              }}
              type="button"
              className={`min-h-11 w-full text-left flex justify-between items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
                idx === currentIndex
                  ? "bg-primary-soft border border-primary/30"
                  : "border border-transparent hover:bg-primary-soft"
              }`}
            >
              <span className="text-text text-sm font-medium">{p.phrase}</span>
              <span className="text-text-muted text-sm">{p.meaning}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
