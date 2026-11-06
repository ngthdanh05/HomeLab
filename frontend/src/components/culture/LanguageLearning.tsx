"use client";

import React, { useEffect, useRef, useState } from "react";
import { CulturalDestination } from "@/data/culturalData";

interface LanguageLearningProps {
  destination: CulturalDestination;
}

export function LanguageLearning({ destination }: LanguageLearningProps) {
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
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-bold text-lg">
          💬 Học ngôn ngữ địa phương
        </h3>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>
            {completed.size}/{phrases.length} đã học
          </span>
          {completed.size > 0 && (
            <button
              onClick={handleReset}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Làm lại
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700 rounded-full mb-6">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${(completed.size / phrases.length) * 100}%` }}
        />
      </div>

      {/* Flash card */}
      <div
        role="button"
        tabIndex={0}
        className="relative h-48 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
        aria-label={flipped ? "Xem lại cụm từ" : "Lật thẻ để xem nghĩa"}
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
            className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-900 rounded-2xl flex flex-col items-center justify-center border border-emerald-700/50"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-white mb-2 px-4 text-center">
              {currentPhrase.phrase}
            </p>
            <p className="text-emerald-300 text-sm">Phát âm: {currentPhrase.pronunciation}</p>
            <p className="text-slate-400 text-xs mt-4">
              Nhấn để xem nghĩa 👆
            </p>
          </div>

          {/* Back - Meaning */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl flex flex-col items-center justify-center border border-slate-500"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-xl sm:text-2xl font-bold text-white mb-2 px-4 text-center">
              {currentPhrase.meaning}
            </p>
            <p className="text-slate-300 text-sm italic">
              &quot;{currentPhrase.phrase}&quot;
            </p>
            <p className="text-slate-400 text-xs mt-4">
              📢 {currentPhrase.pronunciation}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handlePrev}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
        >
          ← Trước
        </button>

        <div className="flex gap-1">
          {phrases.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? "bg-emerald-400"
                  : completed.has(idx)
                    ? "bg-emerald-700"
                    : "bg-slate-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-colors"
        >
          Tiếp →
        </button>
      </div>

      {/* All phrases list */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <p className="text-slate-400 text-xs mb-3 uppercase tracking-wide">
          Tất cả cụm từ
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
              className={`w-full text-left flex justify-between items-center px-3 py-2 rounded-lg transition-colors ${
                idx === currentIndex
                  ? "bg-emerald-900/40 border border-emerald-700/50"
                  : "hover:bg-slate-700"
              }`}
            >
              <span className="text-white text-sm font-medium">{p.phrase}</span>
              <span className="text-slate-400 text-sm">{p.meaning}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
