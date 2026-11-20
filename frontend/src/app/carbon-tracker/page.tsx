"use client";

import React, { useState } from "react";
import { ChartColumn, Earth, Leaf, Lightbulb } from "lucide-react";
import { useAccount } from "wagmi";
import {
  CarbonCalculator,
  DEFAULT_LEGS,
  resultFromLegs,
  type TripResult,
} from "@/components/carbon/CarbonCalculator";
import { CarbonMeter } from "@/components/carbon/CarbonMeter";
import { CarbonOffsetButton } from "@/components/carbon/CarbonOffsetButton";
import { Input } from "@/components/ui";
import { useCarbonOffset } from "@/hooks/useCarbonOffset";
import { formatKg } from "@/lib/carbon-utils";
import { useI18n } from "@/providers/LocaleProvider";

export default function CarbonTrackerPage() {
  const { locale, t } = useI18n();
  const { address } = useAccount();
  const [stored, setResult] = useState<TripResult>(() => resultFromLegs(DEFAULT_LEGS, locale));
  // Calculator results are re-labelled when the language changes; AI text stays as generated.
  const result = stored.legs ? resultFromLegs(stored.legs, locale) : stored;
  const [destination, setDestination] = useState("");

  return (
    <>
      <section className="relative overflow-hidden rounded-lg border border-info/30 bg-info-soft p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-info/30 bg-surface px-3 py-1 text-xs font-semibold text-info">
          <Earth aria-hidden className="h-4 w-4" />
          {t("Hành trình xanh", "Green Journey")}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          {t("Đo, giảm và bù đắp dấu chân carbon của chuyến đi", "Measure, reduce and offset your trip's carbon footprint")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          {t(
            "Tính lượng CO₂ theo từng chặng hoặc mô tả hành trình để trợ lý ước tính. Khi bù đắp, phí được chuyển thẳng vào Quỹ bảo tồn biển, ghi công khai, và bạn nhận Huy hiệu Bù đắp carbon — minh bạch, không tẩy xanh.",
            "Calculate CO₂ leg by leg, or describe your trip and let the assistant estimate it. When you offset, the fee goes straight to the Ocean Conservation Fund, recorded publicly, and you receive a Carbon Offset badge: transparent, with no greenwashing.",
          )}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CarbonCalculator onResult={setResult} />
        </div>

        <section
          aria-labelledby="result-title"
          className="space-y-5 rounded-lg border border-border bg-surface p-5 sm:p-6 lg:col-span-2"
        >
          <h2 id="result-title" className="flex flex-wrap items-center gap-2 text-lg font-bold text-text">
            <ChartColumn aria-hidden className="h-5 w-5 text-primary" />
            {t("Kết quả", "Result")} {result.source === "ai" && <span className="text-xs font-medium text-info">{t("(trợ lý ước tính)", "(assistant estimate)")}</span>}
          </h2>
          <CarbonMeter kg={result.totalKg} />

          {result.totalKg <= 0 && (
            <p className="text-sm text-text-muted">
              {t(
                "Nhập quãng đường của chuyến đi để xem lượng phát thải.",
                "Enter your trip's distances to see its emissions.",
              )}
            </p>
          )}

          {result.breakdown.length > 0 && (
            <ul className="space-y-2 text-sm">
              {result.breakdown.map((item, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <span className="text-text-muted">{item.activity}</span>
                  <span className="shrink-0 tabular-nums text-text">{formatKg(item.kgCO2, locale)}</span>
                </li>
              ))}
            </ul>
          )}

          {result.suggestions.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary-soft p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Lightbulb aria-hidden className="h-4 w-4" />
                {t("Gợi ý giảm phát thải", "Ways to reduce emissions")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-text-muted">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <label className="block text-sm font-medium text-text">
            {t("Điểm đến (ghi vào huy hiệu, tuỳ chọn)", "Destination (recorded on the badge, optional)")}
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={100}
              placeholder={t("Ví dụ: Hội An", "Example: Hoi An")}
              className="mt-2"
            />
          </label>
          <CarbonOffsetButton kg={result.totalKg} summary={result.summary} location={destination} />
        </section>
      </div>

      <OffsetSummary tripKg={result.totalKg} user={address} />
    </>
  );
}

/** "Chuyến đi của bạn phát thải X kgCO₂. Đã được bù đắp bởi Y huy hiệu." Only once a trip has been entered. */
function OffsetSummary({ tripKg, user }: { tripKg: number; user?: `0x${string}` }) {
  const { locale, t } = useI18n();
  const { address: contract, offsetGrams, offsetCount } = useCarbonOffset(user);
  const offsetKg = offsetGrams !== undefined ? Number(offsetGrams) / 1000 : undefined;
  const covered = offsetKg !== undefined && tripKg > 0 ? Math.min(100, (offsetKg / tripKg) * 100) : 0;

  return (
    <section
      aria-labelledby="summary-title"
      className="rounded-lg border border-primary/30 bg-primary-soft p-5 sm:p-6"
    >
      <h2 id="summary-title" className="flex items-center gap-2 text-lg font-bold text-text">
        <Leaf aria-hidden className="h-5 w-5 text-primary" />
        {t("Tóm tắt bù đắp", "Offset summary")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text sm:text-base">
        {tripKg > 0 ? (
          <>
            {t("Chuyến đi của bạn phát thải", "Your trip emits")} <strong className="text-text">{formatKg(tripKg, locale)}</strong>.{" "}
          </>
        ) : (
          <>{t("Bạn chưa nhập chuyến đi nào.", "You have not entered a trip yet.")} </>
        )}
        {!contract ? (
          <span className="text-text-muted">{t("Chưa bù đắp được trên mạng này.", "Offsetting is not available on this network.")}</span>
        ) : !user ? (
          <span className="text-text-muted">{t("Kết nối ví để xem lượng đã bù đắp.", "Connect your wallet to see how much you have offset.")}</span>
        ) : offsetCount === undefined || offsetKg === undefined ? (
          <span className="text-text-muted">{t("Đang tải…", "Loading…")}</span>
        ) : (
          <>
            {t("Đã được bù đắp bởi", "Offset by")}{" "}
            <strong className="text-primary">
              {t(`${offsetCount.toString()} Huy hiệu Bù đắp carbon`, `${offsetCount.toString()} Carbon Offset badge${offsetCount === 1n ? "" : "s"}`)}
            </strong>{" "}
            ({t("tổng", "total")}{" "}
            <strong className="text-primary">{formatKg(offsetKg, locale)}</strong>).
          </>
        )}
      </p>
      {user && contract && offsetKg !== undefined && tripKg > 0 && (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(covered)}
            aria-label={t("Tỉ lệ đã bù đắp so với chuyến đi", "Share of this trip already offset")}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${covered}%` }} />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {covered >= 100
              ? t("Lượng đã bù đắp đủ cho chuyến đi này", "Your offsets fully cover this trip")
              : t(
                  `Đã bù đắp tương đương ${covered.toFixed(0)}% lượng phát thải của chuyến đi này.`,
                  `Offsets equal ${covered.toFixed(0)}% of this trip's emissions.`,
                )}
          </p>
        </div>
      )}
    </section>
  );
}
