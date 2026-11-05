"use client";

import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { EcoTokenABI, PaymentSplitterABI } from "@/config/contracts";
import { useActiveChain } from "./useActiveChain";

export const ECO_DECIMALS = 18;
const REFRESH_MS = 30_000;

/** ECO balance of `owner` (EcoToken.balanceOf), refreshed periodically and after each tx. */
export function useEcoTokenBalance(owner: Address | undefined) {
  const { chainId, addresses } = useActiveChain();

  const balance = useReadContract({
    address: addresses.ecoToken,
    abi: EcoTokenABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: Boolean(owner), refetchInterval: REFRESH_MS },
  });

  // ECO minted per 1 ETH spent (wei-scaled), shown as the earning rate.
  const rewardRate = useReadContract({
    address: addresses.paymentSplitter,
    abi: PaymentSplitterABI,
    functionName: "ecoRewardRate",
    chainId,
    query: { staleTime: 5 * 60 * 1000 },
  });

  return {
    balance: typeof balance.data === "bigint" ? balance.data : undefined,
    rewardRate: typeof rewardRate.data === "bigint" ? rewardRate.data : undefined,
    isLoading: balance.isLoading,
    error: balance.error,
    refetch: balance.refetch,
  };
}
