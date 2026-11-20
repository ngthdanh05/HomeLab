"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Award, Earth } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/ui";
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
 * Pays the offset fee (to the Ocean Conservation Fund) through CarbonOffset.offset()
 * and mints a ZERO_CARBON ImpactBadge to the connected wallet.
 */
export function CarbonOffsetButton({ kg, summary, location }: CarbonOffsetButtonProps) {
  const { locale, t } = useI18n();
  const { isConnected } = useAccount();
  const { chainId } = useActiveChain();
  const { address, pricePerKgWei, isLoading } = useCarbonOffset(undefined);
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang bù đắp carbon", "Offsetting carbon"),
    success: t("Đã bù đắp carbon! Bạn đã nhận Huy hiệu Bù đắp carbon", "Carbon offset! You received a Carbon Offset badge"),
  });

  const offsetKg = Math.min(kg, CARBON_LIMITS.maxOffsetKg);
  const grams = kgToGrams(offsetKg);
  const fee = pricePerKgWei !== undefined ? quoteOffsetWei(grams, pricePerKgWei) : undefined;
  const done = status === "success" || status === "unconfirmed";
  const belowMinimum = grams > 0n && offsetKg < CARBON_LIMITS.minOffsetKg;

  if (!address) {
    return (
      <p className="rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
        {t(
          `Hợp đồng bù đắp carbon chưa có trên ${getChainName(chainId)}, nên chưa thể bù đắp.`,
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
          : t("Đang chờ mạng xác nhận…", "Waiting for on-chain confirmation…")
        : !isConnected
          ? t("Kết nối ví để bù đắp", "Connect wallet to offset")
          : fee === undefined
            ? t("Đang tải phí bù đắp…", "Loading offset fee…")
            : t(`Bù đắp ${formatKg(offsetKg, locale)} · ${formatEther(fee)} ETH`, `Offset ${formatKg(offsetKg, locale)} · ${formatEther(fee)} ETH`);

  const canOffset = grams > 0n && !belowMinimum && isConnected && fee !== undefined;

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
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold tabular-nums text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
      >
        {isBusy ? <Spinner /> : canOffset && <Earth aria-hidden className="h-5 w-5 shrink-0" />}
        {label}
      </button>
      <p className="text-sm leading-relaxed text-text-muted">
        <strong className="font-semibold text-warning">
          {t("Khoản này chưa phải tín chỉ carbon đã được kiểm định.", "This is not a verified carbon credit.")}
        </strong>{" "}
        {t(
          "Toàn bộ phí được chuyển vào Quỹ bảo tồn biển để tài trợ dự án bảo tồn; bạn nhận Huy hiệu Bù đắp carbon ghi nhận đóng góp.",
          "The whole fee goes to the Ocean Conservation Fund to fund conservation projects, and you receive a Carbon Offset badge recording your contribution.",
        )}
        {kg > CARBON_LIMITS.maxOffsetKg &&
          t(` Mỗi lần bù đắp tối đa ${formatKg(CARBON_LIMITS.maxOffsetKg, locale)}.`, ` Each offset is limited to ${formatKg(CARBON_LIMITS.maxOffsetKg, locale)}.`)}
      </p>
      {done && (
        <Link href="/dashboard" className="flex min-h-11 items-center justify-center gap-2 text-center text-sm font-medium text-primary hover:underline">
          <Award aria-hidden className="h-4 w-4 shrink-0" />
          {t("Xem Huy hiệu Bù đắp carbon trong Của tôi", "View your Carbon Offset badge in My page")}
          <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
        </Link>
      )}
    </div>
  );
}
