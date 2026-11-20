"use client";

import React from "react";
import { formatTokenAmount } from "@/lib/dashboard";
import { intlLocale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";
import { cn } from "./cn";

export interface AmountProps {
  /** bigint: số nguyên theo `decimals` (wei, đơn vị nhỏ nhất của ECO) · number: giá trị đã quy đổi. */
  value: bigint | number;
  /** Ký hiệu đơn vị, ví dụ "ETH", "ECO", "kg CO₂". */
  symbol?: string;
  decimals?: number;
  maxFractionDigits?: number;
  /** Màu nhấn: `accent` cho phần thưởng. */
  tone?: "default" | "primary" | "accent";
  className?: string;
}

const TONES = { default: "", primary: "text-primary", accent: "text-accent-strong" } as const;

/** Số tiền / số lượng: font thường + tabular-nums, định dạng theo ngôn ngữ đang chọn. */
export function Amount({ value, symbol, decimals = 18, maxFractionDigits = 4, tone = "default", className }: AmountProps) {
  const { locale } = useI18n();
  const formatted =
    typeof value === "bigint"
      ? formatTokenAmount(value, decimals, maxFractionDigits, locale)
      : value.toLocaleString(intlLocale(locale), { maximumFractionDigits: maxFractionDigits });

  return (
    <span className={cn("whitespace-nowrap tabular-nums", TONES[tone], className)}>
      {formatted}
      {/* Cùng cỡ chữ với số: thu nhỏ theo em có thể xuống dưới 12px. */}
      {/* Khoảng trắng thật (không chỉ margin) để trình đọc màn hình đọc "12 kg", không phải "12kg". */}
      {symbol && (
        <>
          {" "}
          <span className="font-medium">{symbol}</span>
        </>
      )}
    </span>
  );
}
