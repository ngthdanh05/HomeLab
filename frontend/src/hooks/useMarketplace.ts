"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { MarketplaceABI } from "@/config/contracts";
import {
  decodeDataJsonUri,
  getRecentListingIds,
  normalizeMetadata,
  resolveUri,
  type Listing,
  type ListingMetadata,
} from "@/lib/marketplace";
import { useActiveChain } from "./useActiveChain";

/** Newest listings first. `nextListingId` drives which IDs are fetched. */
export function useListings() {
  const { chainId, addresses } = useActiveChain();

  const nextId = useReadContract({
    address: addresses.marketplace,
    abi: MarketplaceABI,
    functionName: "nextListingId",
    chainId,
  });

  const ids = useMemo(
    () => (typeof nextId.data === "bigint" ? getRecentListingIds(nextId.data) : []),
    [nextId.data],
  );

  const listingsQuery = useReadContracts({
    contracts: ids.map((id) => ({
      address: addresses.marketplace,
      abi: MarketplaceABI,
      functionName: "getListing",
      args: [id],
      chainId,
    })),
    query: { enabled: ids.length > 0 },
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
    query: { enabled: listingId !== null },
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

async function fetchMetadata(uri: string): Promise<ListingMetadata | null> {
  if (uri.startsWith("data:")) return normalizeMetadata(decodeDataJsonUri(uri));

  const url = resolveUri(uri);
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
  return normalizeMetadata(await response.json());
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
