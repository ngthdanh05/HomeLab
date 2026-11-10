"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatUnits, type Address } from "viem";
import { ECO_DECIMALS, useEcoTokenBalance } from "@/hooks/useEcoTokenBalance";
import { easeOutCubic, formatTokenAmount } from "@/lib/dashboard";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

const COUNT_UP_MS = 1_200;

/** Animates from the previously shown value to `target`; skipped for reduced motion. */
function useCountUp(target: number | undefined) {
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (target === undefined) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = shown.current;
    if (reduce || from === target) {
      shown.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = easeOutCubic((now - start) / COUNT_UP_MS);
      shown.current = from + (target - from) * t;
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export function TokenBalance({ owner }: { owner: Address }) {
  const { locale, t } = useI18n();
  const { balance, rewardRate, isLoading, error } = useEcoTokenBalance(owner);
  const target = balance !== undefined ? Number(formatUnits(balance, ECO_DECIMALS)) : undefined;
  const animated = useCountUp(target);
  const done = target !== undefined && Math.abs(animated - target) < 1e-9;

  return (
    <section
      aria-labelledby="eco-balance-title"
      className="relative overflow-hidden rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-900/70 via-slate-900 to-slate-950 p-6"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
      <p id="eco-balance-title" className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
        🌱 {t("Số dư EcoToken", "EcoToken balance")}
      </p>

      {isLoading ? (
        <div className="mt-3 h-10 w-48 animate-pulse rounded-lg bg-slate-800" aria-label={t("Đang tải số dư", "Loading balance")} />
      ) : error ? (
        <p className="mt-3 text-sm text-red-300">{t("Không đọc được số dư ECO. Vui lòng thử lại sau.", "Could not read your ECO balance. Please try again later.")}</p>
      ) : (
        <p className="mt-2 flex items-baseline gap-2" aria-live="polite">
          <span className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums">
            {/* Exact bigint formatting once the animation ends; floats only while counting. */}
            {done && balance !== undefined
              ? formatTokenAmount(balance, ECO_DECIMALS, 4, locale)
              : animated.toLocaleString(intlLocale(locale), { maximumFractionDigits: 4 })}
          </span>
          <span className="text-lg font-semibold text-emerald-300">ECO</span>
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {rewardRate !== undefined && rewardRate > 0n
          ? t(
              `Mỗi 1 ETH chi tiêu trên Marketplace thưởng ${formatTokenAmount(rewardRate, ECO_DECIMALS, 4, locale)} ECO.`,
              `Every 1 ETH spent on the Marketplace earns ${formatTokenAmount(rewardRate, ECO_DECIMALS, 4, locale)} ECO.`,
            )
          : t("Nhận ECO mỗi khi mua sản phẩm hoặc tour trên Marketplace.", "Earn ECO every time you buy a product or tour on the Marketplace.")}{" "}
        {t("Dùng ECO để biểu quyết trong DAO Quỹ Cộng đồng.", "Use ECO to vote in the Community Treasury DAO.")}
      </p>
    </section>
  );
}
