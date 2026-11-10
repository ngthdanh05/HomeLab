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
import { useI18n } from "@/providers/LocaleProvider";

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
  const { locale, t } = useI18n();
  const { isConnected } = useAccount();
  const { chainId } = useActiveChain();
  const { address, pricePerKgWei, isLoading } = useCarbonOffset(undefined);
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang bù đắp carbon", "Offsetting carbon"),
    success: t("Đã bù đắp carbon! 🌍 Badge ZERO_CARBON đã được mint", "Carbon offset! 🌍 Your ZERO_CARBON badge has been minted"),
  });

  const offsetKg = Math.min(kg, CARBON_LIMITS.maxOffsetKg);
  const grams = kgToGrams(offsetKg);
  const fee = pricePerKgWei !== undefined ? quoteOffsetWei(grams, pricePerKgWei) : undefined;
  const done = status === "success" || status === "unconfirmed";
  const belowMinimum = grams > 0n && offsetKg < CARBON_LIMITS.minOffsetKg;

  if (!address) {
    return (
      <p className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
        {t(
          `Contract CarbonOffset chưa được deploy trên ${getChainName(chainId)}, nên chưa thể bù đắp on-chain.`,
          `The CarbonOffset contract is not deployed on ${getChainName(chainId)}, so on-chain offsetting is not available yet.`,
        )}
      </p>
    );
  }

  const label =
    grams === 0n
      ? t("Nhập hành trình để bù đắp", "Enter a trip to offset")
      : belowMinimum
        ? t(`Tối thiểu ${formatKg(CARBON_LIMITS.minOffsetKg, locale)} mỗi lần bù đắp`, `Minimum ${formatKg(CARBON_LIMITS.minOffsetKg, locale)} per offset`)
      : isBusy
        ? status === "awaiting-wallet"
          ? t("Xác nhận trong ví…", "Confirm in wallet…")
          : t("Đang chờ xác nhận on-chain…", "Waiting for on-chain confirmation…")
        : !isConnected
          ? t("Kết nối ví để bù đắp", "Connect wallet to offset")
          : fee === undefined
            ? t("Đang tải phí bù đắp…", "Loading offset fee…")
            : t(`🌍 Bù đắp ${formatKg(offsetKg, locale)} · ${formatEther(fee)} ETH`, `🌍 Offset ${formatKg(offsetKg, locale)} · ${formatEther(fee)} ETH`);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={grams === 0n || belowMinimum || isBusy || (isConnected && fee === undefined) || isLoading}
        aria-busy={isBusy}
        onClick={() =>
          send({
            address,
            abi: CarbonOffsetABI,
            functionName: "offset",
            args: [grams, buildOffsetMetadataUri({ kg: offsetKg, summary, location, locale })],
            value: fee,
          })
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isBusy && <Spinner />}
        {label}
      </button>
      <p className="text-[11px] leading-relaxed text-slate-400">
        {t(
          "Toàn bộ phí được chuyển vào Quỹ Cộng đồng (DAO) để tài trợ dự án bảo tồn; bạn nhận NFT ImpactBadge loại ZERO_CARBON ghi nhận đóng góp. Khoản này chưa phải tín chỉ carbon đã được kiểm định.",
          "The whole fee goes to the Community Treasury (DAO) to fund conservation projects, and you receive a ZERO_CARBON ImpactBadge NFT recording your contribution. This is not a verified carbon credit.",
        )}
        {kg > CARBON_LIMITS.maxOffsetKg &&
          t(` Mỗi lần bù đắp tối đa ${formatKg(CARBON_LIMITS.maxOffsetKg, locale)}.`, ` Each offset is limited to ${formatKg(CARBON_LIMITS.maxOffsetKg, locale)}.`)}
      </p>
      {done && (
        <Link href="/dashboard" className="block text-center text-sm font-medium text-emerald-400 hover:underline">
          🏅 {t("Xem badge ZERO_CARBON trong Dashboard →", "View your ZERO_CARBON badge in the Dashboard →")}
        </Link>
      )}
    </div>
  );
}
