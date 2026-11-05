"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useQueries } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { ImpactBadgeABI } from "@/config/contracts";
import { normalizeBadgeMetadata, type BadgeMetadata } from "@/lib/dashboard";
import { fetchJsonUri } from "@/lib/marketplace";
import { useActiveChain } from "./useActiveChain";

const REFRESH_MS = 30_000;

export interface UserBadge {
  tokenId: bigint;
  badgeType: number;
  /** Unix seconds. */
  issuedAt: number;
  tokenURI?: string;
  metadata?: BadgeMetadata | null;
  isMetadataLoading: boolean;
}

interface OnChainBadge {
  badgeType: number;
  issuedAt: bigint;
  recipient: Address;
}

/**
 * Badges owned by `owner`: token IDs from ImpactBadge.getBadgesByOwner, on-chain
 * details (type, mint time) and tokenURI per badge, then IPFS metadata.
 * Newest badges first.
 */
export function useUserBadges(owner: Address | undefined) {
  const { chainId, addresses } = useActiveChain();

  const idsQuery = useReadContract({
    address: addresses.impactBadge,
    abi: ImpactBadgeABI,
    functionName: "getBadgesByOwner",
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: Boolean(owner), refetchInterval: REFRESH_MS },
  });

  const ids = useMemo(
    () => [...((idsQuery.data as readonly bigint[] | undefined) ?? [])].reverse(),
    [idsQuery.data],
  );

  const detailsQuery = useReadContracts({
    contracts: ids.flatMap((id) => [
      { address: addresses.impactBadge, abi: ImpactBadgeABI, functionName: "getBadge", args: [id], chainId },
      { address: addresses.impactBadge, abi: ImpactBadgeABI, functionName: "tokenURI", args: [id], chainId },
    ]),
    query: { enabled: ids.length > 0 },
  });

  const details = useMemo(
    () =>
      ids.map((tokenId, i) => {
        const badge = detailsQuery.data?.[i * 2];
        const uri = detailsQuery.data?.[i * 2 + 1];
        const info = badge?.status === "success" ? (badge.result as OnChainBadge) : undefined;
        return {
          tokenId,
          badgeType: info ? Number(info.badgeType) : 0,
          issuedAt: info ? Number(info.issuedAt) : 0,
          tokenURI: uri?.status === "success" ? (uri.result as string) : undefined,
        };
      }),
    [ids, detailsQuery.data],
  );

  // Many badges share the contract's default URI, so fetch each URI once.
  const uris = useMemo(
    () => [...new Set(details.map((d) => d.tokenURI).filter((u): u is string => Boolean(u)))],
    [details],
  );
  const metadataQueries = useQueries({
    queries: uris.map((uri) => ({
      queryKey: ["badge-metadata", uri],
      queryFn: async () => normalizeBadgeMetadata(await fetchJsonUri(uri)),
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const badges: UserBadge[] = details.map((d) => {
    const query = d.tokenURI ? metadataQueries[uris.indexOf(d.tokenURI)] : undefined;
    return {
      ...d,
      metadata: query?.data,
      isMetadataLoading: Boolean(query?.isLoading) || (detailsQuery.isLoading && !d.tokenURI),
    };
  });

  return {
    badges,
    isLoading: idsQuery.isLoading,
    isDetailsLoading: ids.length > 0 && detailsQuery.isLoading,
    error: idsQuery.error ?? detailsQuery.error,
    refetch: async () => {
      await idsQuery.refetch();
      await detailsQuery.refetch();
    },
  };
}
