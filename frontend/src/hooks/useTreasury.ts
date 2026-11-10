"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { CommunityTreasuryABI } from "@/config/contracts";
import { useActiveChain } from "./useActiveChain";

const REFRESH_MS = 30_000;
/** Newest disbursements shown in the treasury history. */
export const DISBURSEMENTS_LIMIT = 100;

export interface Disbursement {
  index: number;
  proposalId: bigint;
  recipient: Address;
  amount: bigint;
  timestamp: number;
}

/**
 * CommunityTreasury state: ETH balance and the disbursement history
 * (`disbursements[i]`), refreshed periodically and after each transaction.
 */
export function useTreasury() {
  const { chainId, addresses } = useActiveChain();
  const treasury = addresses.communityTreasury;

  // CommunityTreasury.balance() (a contract read, so useContractTx refreshes it after each tx).
  const balance = useReadContract({
    address: treasury,
    abi: CommunityTreasuryABI,
    functionName: "balance",
    chainId,
    query: { refetchInterval: REFRESH_MS },
  });

  const lengthQuery = useReadContract({
    address: treasury,
    abi: CommunityTreasuryABI,
    functionName: "disbursementsLength",
    chainId,
    query: { refetchInterval: REFRESH_MS },
  });
  const length = typeof lengthQuery.data === "bigint" ? Number(lengthQuery.data) : undefined;

  const totalDisbursedQuery = useReadContract({
    address: treasury,
    abi: CommunityTreasuryABI,
    functionName: "totalDisbursed",
    chainId,
    query: { refetchInterval: REFRESH_MS, retry: false },
  });

  const indexes = useMemo(() => {
    if (!length) return [];
    const out: number[] = [];
    for (let i = length - 1; i >= 0 && out.length < DISBURSEMENTS_LIMIT; i--) out.push(i);
    return out;
  }, [length]);

  const recordsQuery = useReadContracts({
    contracts: indexes.map((i) => ({
      address: treasury,
      abi: CommunityTreasuryABI,
      functionName: "disbursements",
      args: [BigInt(i)],
      chainId,
    })),
    query: { enabled: indexes.length > 0 },
  });

  const disbursements = useMemo<Disbursement[]>(() => {
    const rows = recordsQuery.data ?? [];
    return rows.flatMap((row, k) => {
      // Public array getter returns the struct fields as a tuple.
      if (row.status !== "success" || !Array.isArray(row.result)) return [];
      const [proposalId, recipient, amount, timestamp] = row.result as [bigint, Address, bigint, bigint];
      return [{ index: indexes[k], proposalId, recipient, amount, timestamp: Number(timestamp) }];
    });
  }, [recordsQuery.data, indexes]);

  // Treasury deployed before the on-chain counter: fall back to summing the fetched records.
  const summed = length !== undefined && (length === 0 || disbursements.length > 0)
    ? disbursements.reduce((sum, d) => sum + d.amount, 0n)
    : undefined;
  const totalDisbursed = typeof totalDisbursedQuery.data === "bigint" ? totalDisbursedQuery.data : summed;

  return {
    address: treasury,
    balance: typeof balance.data === "bigint" ? balance.data : undefined,
    disbursements,
    disbursementCount: length,
    totalDisbursed,
    isLoading: balance.isLoading || lengthQuery.isLoading,
    isError: balance.isError || lengthQuery.isError || recordsQuery.isError,
    refetch: () => {
      void balance.refetch();
      void lengthQuery.refetch();
      void totalDisbursedQuery.refetch();
      void recordsQuery.refetch();
    },
  };
}
