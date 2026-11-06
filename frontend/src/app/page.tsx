"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { TravelAssistant } from "@/components/ai/TravelAssistant";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";

type MainTab = "ai" | "culture" | "archive";

const TabSkeleton = () => (
  <div className="h-96 animate-pulse rounded-3xl bg-slate-900" aria-label="Đang tải" role="status" />
);

// Only the default tab (AI assistant) ships with the page; the other tabs load on first open.
const CultureGuideSection = dynamic(
  () => import("@/components/culture/CultureGuideSection").then((m) => m.CultureGuideSection),
  { loading: TabSkeleton },
);
const ArchiveGallery = dynamic(
  () => import("@/components/archive/ArchiveGallery").then((m) => m.ArchiveGallery),
  { loading: TabSkeleton },
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainTab>("ai");
  const { isConnected, address } = useAccount();
  const { chainId, addresses: contractAddresses, isWrongNetwork } = useActiveChain();
  const chainName = getChainName(chainId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <SiteHeader />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-900/50 p-6 sm:p-8">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full">
              <span>✨ Trợ lý Du lịch Thông minh & Di Sản Số Hóa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Khám phá Du lịch Sinh thái Tuần hoàn cùng AI & Three.js
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Tối ưu hành trình giảm thiểu phát thải Carbon, học văn hóa & tiếng
              nói bản địa cùng Gemini AI, và đắm chìm trong không gian di sản 360°
              được lưu trữ phi tập trung.
            </p>
          </div>
        </div>

        {/* Phase 3 Tab Controls */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800/80 w-fit">
          <button
            type="button"
            aria-pressed={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "ai"
                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span>🤖</span>
            <span>AI Travel Assistant</span>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === "culture"}
            onClick={() => setActiveTab("culture")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "culture"
                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span>🏛️</span>
            <span>Culture & Language</span>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === "archive"}
            onClick={() => setActiveTab("archive")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "archive"
                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span>🌐</span>
            <span>360° Digital Archive</span>
          </button>
        </div>

        {/* Active Tab View */}
        <div className="transition-all duration-300">
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>
                  💡 <strong>Gợi ý:</strong> Nhập câu hỏi bên dưới hoặc chuyển
                  sang tab <strong>&ldquo;🗺️ Lịch trình&rdquo;</strong> trong khung chat để AI tự
                  động lên kế hoạch theo số ngày.
                </span>
                <span className="text-emerald-400">Powered by Google Gemini</span>
              </div>
              <TravelAssistant />
            </div>
          )}

          {activeTab === "culture" && (
            <div className="space-y-4">
              <CultureGuideSection />
            </div>
          )}

          {activeTab === "archive" && (
            <div className="space-y-4">
              <ArchiveGallery />
            </div>
          )}
        </div>

        {/* On-Chain Smart Contract Integration Status Footer Card */}
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span aria-hidden>⛓️</span> On-chain Ecosystem Contracts
            </h2>
            <span className="text-xs text-emerald-400 font-mono">
              Network: {chainName}
              {isWrongNetwork && " (ví đang ở mạng chưa hỗ trợ)"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(contractAddresses).map(([name, addr]) => (
              <div
                key={name}
                className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-left space-y-1"
              >
                <div className="text-[11px] font-semibold text-slate-300 capitalize">
                  {name.replace(/([A-Z])/g, " $1")}
                </div>
                <div
                  className="text-[10px] text-emerald-400 font-mono truncate"
                  title={addr}
                >
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </div>
              </div>
            ))}
          </div>

          {isConnected && address && (
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span>Ví du khách đang kết nối:</span>
              <span className="font-mono text-emerald-300">{address}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 MyHomeLab — Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo.</p>
          <p className="text-slate-400">
            Powered by Next.js 14 App Router, Wagmi v2, Google Gemini API & Three.js.
          </p>
        </div>
      </footer>
    </div>
  );
}
