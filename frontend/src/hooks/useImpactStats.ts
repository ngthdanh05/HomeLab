"use client";

import { useMemo } from "react";
import { zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { CarbonOffsetABI, CommunityTreasuryABI, getCarbonOffsetAddress } from "@/config/contracts";
import { useActiveChain } from "./useActiveChain";
import { useListings } from "./useMarketplace";

const REFRESH_MS = 60_000;

/**
 * Con số tác động cho trang chủ, đọc thẳng từ hợp đồng (không có số liệu ước tính):
 * số dư Quỹ bảo tồn biển, số lần giải ngân cho dự án bảo tồn, tổng CO₂ đã bù đắp
 * và số người bán (ngư dân / nghệ nhân) khác nhau trong các sản phẩm gần nhất.
 */
export function useImpactStats() {
  const { chainId, addresses } = useActiveChain();
  const carbonOffset = getCarbonOffsetAddress(chainId);

  const query = useReadContracts({
    contracts: [
      { address: addresses.communityTreasury, abi: CommunityTreasuryABI, functionName: "balance", chainId },
      { address: addresses.communityTreasury, abi: CommunityTreasuryABI, functionName: "disbursementsLength", chainId },
      // Chưa deploy CarbonOffset trên mạng này ⇒ gọi tới 0x0 sẽ lỗi và bị bỏ qua bên dưới.
      { address: carbonOffset ?? zeroAddress, abi: CarbonOffsetABI, functionName: "totalOffsetGrams", chainId },
    ],
    query: { refetchInterval: REFRESH_MS },
  });

  const { listings, isLoading: listingsLoading } = useListings();

  const value = (i: number) => {
    const r = query.data?.[i];
    return r?.status === "success" && typeof r.result === "bigint" ? r.result : undefined;
  };

  const sellerCount = useMemo(
    () => (listingsLoading ? undefined : new Set(listings.map((l) => l.seller.toLowerCase())).size),
    [listings, listingsLoading],
  );

  return {
    treasuryBalance: value(0),
    projectsFunded: value(1),
    offsetGrams: carbonOffset ? value(2) : undefined,
    sellerCount,
    listingCount: listingsLoading ? undefined : listings.length,
    isLoading: query.isLoading,
  };
}
