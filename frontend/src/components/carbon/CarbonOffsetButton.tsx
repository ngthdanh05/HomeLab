"use client";

import React from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/marketplace/PurchaseButton";
import { CarbonOffsetABI, getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useCarbonOffset } from "@/hooks/useCarbonOffset";
import { useContractTx } from "@/hooks/useContractTx";
import {
  CARBON_LIMITS,
  buildOffsetMetadataUri,
  formatKg,
  kgToGrams,
  quoteOffsetWei,
} from "@/lib/carbon-utils";

interface CarbonOffsetButtonProps {
  kg: number;
  /** Trip description stored in the badge metadata. */
  summary?: string;
  location?: string;
}

/**
 * Pays the offset fee (to the Community Treasury) through CarbonOffset.offset()
 * and mints a ZERO_CARBON ImpactBadge to the connected wallet.
 */
export function CarbonOffsetButton({ kg, summary, location }: CarbonOffsetButtonProps) {
  const { isConnected } = useAccount();
  const { chainId } = useActiveChain();
  const { address, pricePerKgWei, isLoading } = useCarbonOffset(undefined);
  const { send, status, isBusy } = useContractTx({
    pending: "Đang bù đắp carbon",
    success: "Đã bù đắp carbon! 🌍 Badge ZERO_CARBON đã được mint",
  });

  const offsetKg = Math.min(kg, CARBON_LIMITS.maxOffsetKg);
  const grams = kgToGrams(offsetKg);
  const fee = pricePerKgWei !== undefined ? quoteOffsetWei(grams, pricePerKgWei) : undefined;
  const done = status === "success" || status === "unconfirmed";

  if (!address) {
    return (
      <p className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
        Contract CarbonOffset chưa được deploy trên {getChainName(chainId)}, nên chưa thể bù đắp on-chain.
      </p>
    );
  }

  const label =
    grams === 0n
      ? "Nhập hành trình để bù đắp"
      : isBusy
        ? status === "awaiting-wallet"
          ? "Xác nhận trong ví…"
          : "Đang chờ xác nhận on-chain…"
        : !isConnected
          ? "Kết nối ví để bù đắp"
          : fee === undefined
            ? "Đang tải phí bù đắp…"
            : `🌍 Bù đắp ${formatKg(offsetKg)} · ${formatEther(fee)} ETH`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={grams === 0n || isBusy || (isConnected && fee === undefined) || isLoading}
        aria-busy={isBusy}
        onClick={() =>
          send({
            address,
            abi: CarbonOffsetABI,
            functionName: "offset",
            args: [grams, buildOffsetMetadataUri({ kg: offsetKg, summary, location })],
            value: fee,
          })
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isBusy && <Spinner />}
        {label}
      </button>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Toàn bộ phí được chuyển vào Quỹ Cộng đồng (DAO) để tài trợ dự án bảo tồn; bạn nhận NFT
        ImpactBadge loại ZERO_CARBON làm bằng chứng.
        {kg > CARBON_LIMITS.maxOffsetKg && ` Mỗi lần bù đắp tối đa ${formatKg(CARBON_LIMITS.maxOffsetKg)}.`}
      </p>
      {done && (
        <Link href="/dashboard" className="block text-center text-sm font-medium text-emerald-400 hover:underline">
          🏅 Xem badge ZERO_CARBON trong Dashboard →
        </Link>
      )}
    </div>
  );
}
