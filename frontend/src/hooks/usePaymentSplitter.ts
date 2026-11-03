"use client";

import { useReadContracts } from "wagmi";
import { PaymentSplitterABI } from "@/config/contracts";
import { DEFAULT_SHARES, type SplitShares } from "@/lib/marketplace";
import { useActiveChain } from "./useActiveChain";

const SHARE_FIELDS = ["artisanBPS", "treasuryBPS", "platformBPS"] as const;

/** Current revenue split from PaymentSplitter, falling back to the 70/20/10 default. */
export function usePaymentSplitter() {
  const { chainId, addresses } = useActiveChain();

  const query = useReadContracts({
    contracts: SHARE_FIELDS.map((functionName) => ({
      address: addresses.paymentSplitter,
      abi: PaymentSplitterABI,
      functionName,
      chainId,
    })),
    query: { staleTime: 5 * 60 * 1000 },
  });

  const values = query.data?.map((r) => (r.status === "success" ? Number(r.result) : NaN));
  const shares: SplitShares =
    values && values.every(Number.isFinite)
      ? { artisanBPS: values[0], treasuryBPS: values[1], platformBPS: values[2] }
      : DEFAULT_SHARES;

  return { shares, isOnChain: shares !== DEFAULT_SHARES, isLoading: query.isLoading };
}
