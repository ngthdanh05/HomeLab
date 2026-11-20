"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";
import {
  CarbonOffsetABI,
  getCarbonOffsetAddress,
  LOGS_FROM_BLOCK,
  MarketplaceABI,
  PaymentSplitterABI,
} from "@/config/contracts";
import type { Listing, Order, OrderRole } from "@/lib/marketplace";
import { getEventsChunked } from "./useActivityFeed";
import { useActiveChain } from "./useActiveChain";

/** Khoá query; useContractTx làm mới sau mỗi giao dịch đã xác nhận. */
export const MY_ORDERS_QUERY_KEY = "my-orders";
export const MY_IMPACT_QUERY_KEY = "my-impact";

const REFRESH_MS = 30_000;

export interface OrderRef {
  listingId: bigint;
  role: OrderRole;
}

export interface MyOrder extends OrderRef {
  listing: Listing;
  order: Order;
}

/** Các listing ví đã mua hoặc đã bán (từ event ListingPurchased), mới nhất trước. */
async function loadOrderRefs(client: PublicClient, user: Address, marketplace: Address, fromBlock: bigint): Promise<OrderRef[]> {
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const base = { address: marketplace, abi: MarketplaceABI, eventName: "ListingPurchased", fromBlock } as const;
  const [bought, sold] = await Promise.all([
    getEventsChunked(client, { ...base, args: { buyer: user } }, latest),
    getEventsChunked(client, { ...base, args: { seller: user } }, latest),
  ]);
  const refs = new Map<string, OrderRef>();
  for (const [events, role] of [
    [bought, "buyer"],
    [sold, "seller"],
  ] as const) {
    for (const e of events) {
      const listingId = e.args.listingId as bigint;
      if (!refs.has(listingId.toString())) refs.set(listingId.toString(), { listingId, role });
    }
  }
  return [...refs.values()].sort((a, b) => (a.listingId > b.listingId ? -1 : 1));
}

/**
 * Đơn hàng và lịch đặt tour của ví: người mua thấy đơn đã mua, nghệ nhân thấy đơn đã bán.
 * Trạng thái giữ tiền đọc trực tiếp từ `Marketplace.getOrder`.
 */
export function useMyOrders(user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const client = usePublicClient({ chainId });

  const refs = useQuery({
    queryKey: [MY_ORDERS_QUERY_KEY, chainId, user],
    queryFn: () =>
      loadOrderRefs(client as PublicClient, user as Address, addresses.marketplace, LOGS_FROM_BLOCK[chainId].marketplace),
    enabled: Boolean(user && client),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });

  const ids = useMemo(() => refs.data ?? [], [refs.data]);
  const market = { address: addresses.marketplace, abi: MarketplaceABI, chainId } as const;
  const reads = useReadContracts({
    contracts: [
      { ...market, functionName: "escrowPeriod" },
      { ...market, functionName: "arbiter" },
      ...ids.flatMap((ref) => [
        { ...market, functionName: "getListing", args: [ref.listingId] },
        { ...market, functionName: "getOrder", args: [ref.listingId] },
      ]),
    ],
    query: { enabled: Boolean(user), refetchInterval: REFRESH_MS },
  });

  const { orders, escrowPeriod, arbiter } = useMemo(() => {
    const rows = reads.data ?? [];
    const ok = (i: number) => (rows[i]?.status === "success" ? rows[i].result : undefined);
    const list: MyOrder[] = [];
    ids.forEach((ref, i) => {
      const listing = ok(2 + i * 2) as Listing | undefined;
      const order = ok(3 + i * 2) as Order | undefined;
      if (listing && order && order.status !== 0) list.push({ ...ref, listing, order });
    });
    return {
      orders: list,
      escrowPeriod: ok(0) as bigint | undefined,
      arbiter: ok(1) as Address | undefined,
    };
  }, [reads.data, ids]);

  return {
    orders,
    escrowPeriod,
    arbiter,
    isLoading: Boolean(user) && (refs.isLoading || (ids.length > 0 && reads.isLoading)),
    error: refs.error ?? reads.error,
    refetch: async () => {
      await refs.refetch();
      await reads.refetch();
    },
  };
}

export interface MyImpact {
  /** ETH vào Quỹ bảo tồn biển từ phí bù đắp carbon (toàn bộ phí). */
  offsetPaidWei: bigint;
  /** ETH vào Quỹ từ phần 20% các đơn mua đã giải ngân. */
  purchaseTreasuryWei: bigint;
  /** Số đơn mua đã hoàn tất. */
  completedPurchases: number;
}

async function loadImpact(
  client: PublicClient,
  user: Address,
  addresses: { marketplace: Address; paymentSplitter: Address; carbonOffset?: Address },
  fromBlocks: { marketplace: bigint; paymentSplitter: bigint; carbonOffset?: bigint },
): Promise<MyImpact> {
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const [released, offsets] = await Promise.all([
    getEventsChunked(
      client,
      { address: addresses.marketplace, abi: MarketplaceABI, eventName: "OrderReleased", args: { buyer: user }, fromBlock: fromBlocks.marketplace },
      latest,
    ),
    addresses.carbonOffset
      ? getEventsChunked(
          client,
          {
            address: addresses.carbonOffset,
            abi: CarbonOffsetABI,
            eventName: "CarbonOffsetted",
            args: { user },
            fromBlock: fromBlocks.carbonOffset ?? fromBlocks.marketplace,
          },
          latest,
        )
      : Promise.resolve([]),
  ]);

  // PaymentSplit chỉ index theo nghệ nhân: lấy theo người bán của các đơn rồi khớp đúng giao dịch giải ngân.
  let purchaseTreasuryWei = 0n;
  if (released.length > 0) {
    const sellers = [...new Set(released.map((e) => (e.args.seller as string).toLowerCase()))] as Address[];
    const txs = new Set(released.map((e) => e.transactionHash));
    const splits = await getEventsChunked(
      client,
      {
        address: addresses.paymentSplitter,
        abi: PaymentSplitterABI,
        eventName: "PaymentSplit",
        args: { artisan: sellers },
        fromBlock: fromBlocks.paymentSplitter,
      },
      latest,
    );
    for (const s of splits) if (txs.has(s.transactionHash)) purchaseTreasuryWei += s.args.treasuryAmt as bigint;
  }

  return {
    offsetPaidWei: offsets.reduce((sum, e) => sum + (e.args.paid as bigint), 0n),
    purchaseTreasuryWei,
    completedPurchases: released.length,
  };
}

/** Đóng góp của ví vào Quỹ bảo tồn biển (phí bù đắp carbon + 20% đơn đã mua). */
export function useMyImpact(user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const client = usePublicClient({ chainId });
  return useQuery({
    queryKey: [MY_IMPACT_QUERY_KEY, chainId, user],
    queryFn: () =>
      loadImpact(
        client as PublicClient,
        user as Address,
        { ...addresses, carbonOffset: getCarbonOffsetAddress(chainId) },
        LOGS_FROM_BLOCK[chainId],
      ),
    enabled: Boolean(user && client),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });
}
