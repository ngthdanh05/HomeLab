"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { MarketplaceABI } from "@/config/contracts";
import {
  fetchJsonUri,
  getRecentListingIds,
  LISTINGS_PAGE_SIZE,
  normalizeMetadata,
  type Listing,
  type ListingMetadata,
  type Order,
} from "@/lib/marketplace";
import { useActiveChain } from "./useActiveChain";

/**
 * Background refresh so listings created/sold elsewhere (or a tx that confirmed
 * after the UI stopped waiting) show up without a manual reload.
 */
const LISTINGS_REFRESH_MS = 30_000;

/** Newest listings first. `nextListingId` drives which IDs are fetched. */
export function useListings(limit = LISTINGS_PAGE_SIZE) {
  const { chainId, addresses } = useActiveChain();

  const nextId = useReadContract({
    address: addresses.marketplace,
    abi: MarketplaceABI,
    functionName: "nextListingId",
    chainId,
    query: { refetchInterval: LISTINGS_REFRESH_MS },
  });

  const ids = useMemo(
    () => (typeof nextId.data === "bigint" ? getRecentListingIds(nextId.data, limit) : []),
    [nextId.data, limit],
  );

  const listingsQuery = useReadContracts({
    contracts: ids.map((id) => ({
      address: addresses.marketplace,
      abi: MarketplaceABI,
      functionName: "getListing",
      args: [id],
      chainId,
    })),
    query: { enabled: ids.length > 0, refetchInterval: LISTINGS_REFRESH_MS },
  });

  const listings = useMemo(
    () =>
      (listingsQuery.data ?? [])
        .map((r) => (r.status === "success" ? (r.result as Listing) : null))
        .filter((l): l is Listing => l !== null && l.id > 0n),
    [listingsQuery.data],
  );

  return {
    listings,
    hasMore: typeof nextId.data === "bigint" && BigInt(ids.length) < nextId.data - 1n,
    isLoading: nextId.isLoading || (ids.length > 0 && listingsQuery.isLoading),
    error: nextId.error ?? listingsQuery.error,
    refetch: async () => {
      await nextId.refetch();
      await listingsQuery.refetch();
    },
  };
}

export function useListing(listingId: bigint | null) {
  const { chainId, addresses } = useActiveChain();

  const query = useReadContract({
    address: addresses.marketplace,
    abi: MarketplaceABI,
    functionName: "getListing",
    args: listingId !== null ? [listingId] : undefined,
    chainId,
    query: { enabled: listingId !== null, refetchInterval: LISTINGS_REFRESH_MS },
  });

  const listing = query.data as Listing | undefined;
  return {
    // getListing returns a zeroed struct for unknown IDs.
    listing: listing && listing.id > 0n ? listing : undefined,
    notFound: query.isSuccess && (!listing || listing.id === 0n),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Escrow state of a sold listing plus the rules needed to show its actions. */
export function useOrder(listingId: bigint) {
  const { chainId, addresses } = useActiveChain();
  const market = { address: addresses.marketplace, abi: MarketplaceABI, chainId } as const;
  const query = useReadContracts({
    contracts: [
      { ...market, functionName: "getOrder", args: [listingId] },
      { ...market, functionName: "escrowPeriod" },
      { ...market, functionName: "arbiter" },
    ],
    query: { refetchInterval: LISTINGS_REFRESH_MS },
  });
  const [order, escrowPeriod, arbiter] = query.data ?? [];
  return {
    // Reads fail on a Marketplace deployed before escrow: the panel then stays hidden.
    order: order?.status === "success" ? (order.result as Order) : undefined,
    escrowPeriod: escrowPeriod?.status === "success" ? (escrowPeriod.result as bigint) : undefined,
    arbiter: arbiter?.status === "success" ? (arbiter.result as `0x${string}`) : undefined,
  };
}

async function fetchMetadata(uri: string): Promise<ListingMetadata | null> {
  return normalizeMetadata(await fetchJsonUri(uri));
}

/** IPFS metadata is immutable for a given URI, so it is cached indefinitely. */
export function useListingMetadata(uri: string | undefined) {
  return useQuery({
    queryKey: ["listing-metadata", uri],
    queryFn: () => fetchMetadata(uri as string),
    enabled: Boolean(uri),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
