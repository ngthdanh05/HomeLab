"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { formatEther } from "viem";
import { usePaymentSplitter } from "@/hooks/usePaymentSplitter";
import { formatBps, splitPrice } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

/** Shows how a payment is split by PaymentSplitter (optionally for a concrete price). */
export function SplitBreakdown({
  price,
  compact = false,
}: {
  price?: bigint;
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const { shares } = usePaymentSplitter();
  const amounts = price !== undefined ? splitPrice(price, shares) : undefined;

  const rows = [
    {
      label: t("Nghệ nhân", "Artisan"),
      bps: shares.artisanBPS,
      amount: amounts?.artisan,
      color: "bg-primary",
    },
    {
      label: t("Quỹ bảo tồn biển", "Ocean Conservation Fund"),
      bps: shares.treasuryBPS,
      amount: amounts?.treasury,
      color: "bg-accent",
    },
    {
      label: t("Nền tảng", "Platform"),
      bps: shares.platformBPS,
      amount: amounts?.platform,
      color: "bg-border-strong",
    },
  ];

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex h-2 w-full overflow-hidden rounded-full" aria-hidden>
        {rows.map((row) => (
          <div
            key={row.label}
            className={row.color}
            style={{ width: `${row.bps / 100}%` }}
          />
        ))}
      </div>
      <ul
        className={`grid gap-2 ${compact ? "grid-cols-3 text-xs" : "grid-cols-1 sm:grid-cols-3 text-xs"}`}
      >
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2 text-text-muted"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${row.color}`}
              aria-hidden
            />
            <span>
              <strong className="tabular-nums text-text">{formatBps(row.bps, locale)}</strong>{" "}
              <ArrowRight aria-hidden className="inline h-4 w-4 align-text-bottom" />{" "}
              {row.label}
              {row.amount !== undefined && (
                <span className="block tabular-nums text-text-muted">
                  {formatEther(row.amount)} ETH
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
