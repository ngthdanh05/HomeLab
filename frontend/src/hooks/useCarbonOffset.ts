"use client";

import type { Address } from "viem";
import { useReadContracts } from "wagmi";
import { CarbonOffsetABI, getCarbonOffsetAddress } from "@/config/contracts";
import { useActiveChain } from "./useActiveChain";

/**
 * CarbonOffset state for the active chain: price per kg and, for `user`, the
 * total grams offset and number of offsets (= ZERO_CARBON badges from offsetting).
 * `address` is undefined when the contract isn't deployed on this chain.
 */
export function useCarbonOffset(user: Address | undefined) {
  const { chainId } = useActiveChain();
  const address = getCarbonOffsetAddress(chainId);
  const base = { address: address as Address, abi: CarbonOffsetABI, chainId } as const;

  const query = useReadContracts({
    contracts: [
      { ...base, functionName: "pricePerKgWei" },
      { ...base, functionName: "offsetGramsOf", args: [user ?? "0x0000000000000000000000000000000000000000"] },
      { ...base, functionName: "offsetCountOf", args: [user ?? "0x0000000000000000000000000000000000000000"] },
    ],
    query: { enabled: Boolean(address), refetchInterval: 30_000 },
  });

  const value = (i: number) => {
    const r = query.data?.[i];
    return r?.status === "success" && typeof r.result === "bigint" ? r.result : undefined;
  };

  return {
    address,
    pricePerKgWei: value(0),
    offsetGrams: user ? value(1) : undefined,
    offsetCount: user ? value(2) : undefined,
    isLoading: Boolean(address) && query.isLoading,
    error: query.error,
  };
}
