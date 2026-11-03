"use client";

import React from "react";
import { formatEther } from "viem";
import { usePaymentSplitter } from "@/hooks/usePaymentSplitter";
import { formatBps, splitPrice } from "@/lib/marketplace";

/** Shows how a payment is split by PaymentSplitter (optionally for a concrete price). */
export function SplitBreakdown({ price, compact = false }: { price?: bigint; compact?: boolean }) {
  const { shares } = usePaymentSplitter();
  const amounts = price !== undefined ? splitPrice(price, shares) : undefined;

  const rows = [
    { label: "Nghệ nhân", bps: shares.artisanBPS, amount: amounts?.artisan, color: "bg-emerald-500" },
    { label: "Quỹ Cộng đồng", bps: shares.treasuryBPS, amount: amounts?.treasury, color: "bg-teal-400" },
    { label: "Nền tảng", bps: shares.platformBPS, amount: amounts?.platform, color: "bg-slate-500" },
  ];

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex h-2 w-full overflow-hidden rounded-full" aria-hidden>
        {rows.map((row) => (
          <div key={row.label} className={row.color} style={{ width: `${row.bps / 100}%` }} />
        ))}
      </div>
      <ul className={`grid gap-2 ${compact ? "grid-cols-3 text-[11px]" : "grid-cols-1 sm:grid-cols-3 text-xs"}`}>
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-slate-300">
            <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} aria-hidden />
            <span>
              <strong className="text-white">{formatBps(row.bps)}</strong> → {row.label}
              {row.amount !== undefined && (
                <span className="block text-slate-400 font-mono">
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
