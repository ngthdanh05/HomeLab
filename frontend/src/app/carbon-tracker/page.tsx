"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import {
  CarbonCalculator,
  DEFAULT_LEGS,
  resultFromLegs,
  type TripResult,
} from "@/components/carbon/CarbonCalculator";
import { CarbonMeter } from "@/components/carbon/CarbonMeter";
import { CarbonOffsetButton } from "@/components/carbon/CarbonOffsetButton";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useCarbonOffset } from "@/hooks/useCarbonOffset";
import { formatKg } from "@/lib/carbon-utils";

export default function CarbonTrackerPage() {
  const { chainId } = useActiveChain();
  const { address } = useAccount();
  const [result, setResult] = useState<TripResult>(() => resultFromLegs(DEFAULT_LEGS));
  const [destination, setDestination] = useState("");

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-sky-900/50 bg-gradient-to-r from-sky-950 via-slate-900 to-slate-900 p-6 sm:p-8">
        <span className="inline-flex rounded-full border border-sky-800/80 bg-sky-950/80 px-3 py-1 text-xs font-semibold text-sky-300">
          🌍 Carbon Tracker · {getChainName(chainId)}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Đo, giảm và bù đắp dấu chân carbon của chuyến đi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Tính lượng CO₂ theo từng chặng hoặc mô tả hành trình để AI ước tính. Khi bù đắp, phí được chuyển
          thẳng vào Quỹ Cộng đồng on-chain và bạn nhận NFT ZERO_CARBON — minh bạch, không tẩy xanh.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CarbonCalculator onResult={setResult} />
        </div>

        <section
          aria-labelledby="result-title"
          className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 lg:col-span-2"
        >
          <h2 id="result-title" className="text-lg font-bold text-white">
            📊 Kết quả {result.source === "ai" && <span className="text-xs font-medium text-sky-300">(AI ước tính)</span>}
          </h2>
          <CarbonMeter kg={result.totalKg} />

          {result.breakdown.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {result.breakdown.map((item, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-slate-800 pb-1.5 last:border-0">
                  <span className="text-slate-300">{item.activity}</span>
                  <span className="shrink-0 font-mono text-slate-100">{formatKg(item.kgCO2)}</span>
                </li>
              ))}
            </ul>
          )}

          {result.suggestions.length > 0 && (
            <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-3">
              <p className="text-xs font-semibold text-emerald-300">💡 Gợi ý giảm phát thải</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-slate-300">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <label className="block text-xs text-slate-400">
            Điểm đến (ghi vào badge, tuỳ chọn)
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={100}
              placeholder="Ví dụ: Hội An"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <CarbonOffsetButton kg={result.totalKg} summary={result.summary} location={destination} />
        </section>
      </div>

      <OffsetSummary tripKg={result.totalKg} user={address} />
    </>
  );
}

/** "Chuyến đi của bạn phát thải X kgCO₂. Đã được bù đắp bởi Y badges." */
function OffsetSummary({ tripKg, user }: { tripKg: number; user?: `0x${string}` }) {
  const { address: contract, offsetGrams, offsetCount } = useCarbonOffset(user);
  const offsetKg = offsetGrams !== undefined ? Number(offsetGrams) / 1000 : undefined;
  const covered = offsetKg !== undefined && tripKg > 0 ? Math.min(100, (offsetKg / tripKg) * 100) : 0;

  return (
    <section
      aria-labelledby="summary-title"
      className="rounded-3xl border border-emerald-800/50 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 p-5 sm:p-6"
    >
      <h2 id="summary-title" className="text-lg font-bold text-white">
        🌱 Tóm tắt bù đắp
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-200 sm:text-base">
        Chuyến đi của bạn phát thải <strong className="text-white">{formatKg(tripKg)}</strong>.{" "}
        {!contract ? (
          <span className="text-slate-400">Chưa bù đắp được on-chain trên mạng này.</span>
        ) : !user ? (
          <span className="text-slate-400">Kết nối ví để xem lượng đã bù đắp.</span>
        ) : offsetCount === undefined || offsetKg === undefined ? (
          <span className="text-slate-400">Đang tải…</span>
        ) : (
          <>
            Đã được bù đắp bởi <strong className="text-emerald-300">{offsetCount.toString()} badge ZERO_CARBON</strong>{" "}
            (tổng <strong className="text-emerald-300">{formatKg(offsetKg)}</strong>).
          </>
        )}
      </p>
      {user && contract && offsetKg !== undefined && tripKg > 0 && (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(covered)}
            aria-label="Tỉ lệ đã bù đắp so với chuyến đi"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${covered}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {covered >= 100
              ? "Lượng đã bù đắp đủ cho chuyến đi này 🎉"
              : `Đã bù đắp tương đương ${covered.toFixed(0)}% lượng phát thải của chuyến đi này.`}
          </p>
        </div>
      )}
    </section>
  );
}
