"use client";

import { useQuery } from "@tanstack/react-query";
import type { Abi, Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import {
  CarbonOffsetABI,
  getCarbonOffsetAddress,
  getQuestRewardsAddress,
  ImpactBadgeABI,
  LOGS_FROM_BLOCK,
  MarketplaceABI,
  PaymentSplitterABI,
  QuestRewardsABI,
} from "@/config/contracts";
import { buildActivityFeed, getBlockRanges, type ActivityItem, type ChainEvent } from "@/lib/dashboard";
import { useActiveChain } from "./useActiveChain";

/** Query key prefix; useContractTx invalidates it after every confirmed tx. */
export const ACTIVITY_QUERY_KEY = "dashboard-activity";

/** Public Sepolia RPCs cap eth_getLogs at 50k blocks per request. */
const LOGS_CHUNK = 49_000n;
/** Smallest window tried when an RPC rejects a range before giving up. */
const MIN_CHUNK = 1_000n;
/** Never scan further back than this (~70 days on Sepolia). */
const MAX_SCAN_BLOCKS = 500_000n;
export const ACTIVITY_LIMIT = 20;

export interface EventQuery {
  address: Address;
  abi: Abi;
  eventName: string;
  args: Record<string, unknown>;
  fromBlock: bigint;
}

/** getContractEvents over [from, to] in chunks, halving the window when the RPC rejects it. */
export async function getEventsChunked(
  client: PublicClient,
  query: EventQuery,
  toBlock: bigint,
): Promise<ChainEvent[]> {
  const fromBlock =
    query.fromBlock > toBlock - MAX_SCAN_BLOCKS ? query.fromBlock : toBlock - MAX_SCAN_BLOCKS;

  const fetchRange = async (from: bigint, to: bigint, size: bigint): Promise<ChainEvent[]> => {
    const out: ChainEvent[] = [];
    for (const range of getBlockRanges(from, to, size)) {
      try {
        const logs = await client.getContractEvents({
          address: query.address,
          abi: query.abi,
          eventName: query.eventName,
          args: query.args,
          fromBlock: range.fromBlock,
          toBlock: range.toBlock,
        });
        out.push(...(logs as unknown as ChainEvent[]));
      } catch (error) {
        const span = range.toBlock - range.fromBlock + 1n;
        if (span <= MIN_CHUNK) throw error;
        out.push(...(await fetchRange(range.fromBlock, range.toBlock, span / 2n)));
      }
    }
    return out;
  };

  return fetchRange(fromBlock, toBlock, LOGS_CHUNK);
}

async function loadActivity(
  client: PublicClient,
  user: Address,
  addresses: {
    marketplace: Address;
    paymentSplitter: Address;
    impactBadge: Address;
    carbonOffset?: Address;
    questRewards?: Address;
  },
  fromBlocks: {
    marketplace: bigint;
    paymentSplitter: bigint;
    impactBadge: bigint;
    carbonOffset?: bigint;
    questRewards?: bigint;
  },
): Promise<ActivityItem[]> {
  // cacheTime 0: viem caches the block number for 4 s, which would miss a tx mined just now.
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const get = (q: EventQuery) => getEventsChunked(client, q, latest);

  const market = { address: addresses.marketplace, abi: MarketplaceABI, fromBlock: fromBlocks.marketplace };
  const splitter = {
    address: addresses.paymentSplitter,
    abi: PaymentSplitterABI,
    fromBlock: fromBlocks.paymentSplitter,
  };

  const [bought, sold, created, cancelled, rewards, badges, offsets, quests] = await Promise.all([
    get({ ...market, eventName: "ListingPurchased", args: { buyer: user } }),
    get({ ...market, eventName: "ListingPurchased", args: { seller: user } }),
    get({ ...market, eventName: "ListingCreated", args: { seller: user } }),
    get({ ...market, eventName: "ListingCancelled", args: { cancelledBy: user } }),
    get({ ...splitter, eventName: "EcoRewarded", args: { visitor: user } }),
    get({
      address: addresses.impactBadge,
      abi: ImpactBadgeABI,
      eventName: "BadgeMinted",
      args: { to: user },
      fromBlock: fromBlocks.impactBadge,
    }),
    addresses.carbonOffset
      ? get({
          address: addresses.carbonOffset,
          abi: CarbonOffsetABI,
          eventName: "CarbonOffsetted",
          args: { user },
          fromBlock: fromBlocks.carbonOffset ?? fromBlocks.impactBadge,
        })
      : Promise.resolve([] as ChainEvent[]),
    addresses.questRewards
      ? get({
          address: addresses.questRewards,
          abi: QuestRewardsABI,
          eventName: "QuestCompleted",
          args: { user },
          fromBlock: fromBlocks.questRewards ?? fromBlocks.impactBadge,
        })
      : Promise.resolve([] as ChainEvent[]),
  ]);

  // PaymentSplit is indexed by artisan only: fetch splits paid to the sellers
  // involved (and to the user), then keep those in the user's transactions.
  const artisans = [
    ...new Set([user, ...bought.map((e) => e.args.seller as Address)].map((a) => a.toLowerCase())),
  ] as Address[];
  const splits = await get({ ...splitter, eventName: "PaymentSplit", args: { artisan: artisans } });
  const userTxs = new Set(
    [...bought, ...sold, ...rewards].map((e) => e.transactionHash),
  );
  const relevantSplits = splits.filter(
    (e) =>
      userTxs.has(e.transactionHash) ||
      (e.args.artisan as string).toLowerCase() === user.toLowerCase(),
  );

  const items = buildActivityFeed(
    [...bought, ...sold, ...created, ...cancelled, ...rewards, ...badges, ...offsets, ...quests, ...relevantSplits],
    user,
  ).slice(0, ACTIVITY_LIMIT);

  // Block timestamps for the items shown (one request per distinct block).
  const blocks = [...new Set(items.map((i) => i.blockNumber))];
  const timestamps = new Map<bigint, number>();
  await Promise.all(
    blocks.map(async (blockNumber) => {
      try {
        const block = await client.getBlock({ blockNumber });
        timestamps.set(blockNumber, Number(block.timestamp));
      } catch {
        // A missing timestamp only hides the date in the UI.
      }
    }),
  );
  return items.map((i) => ({ ...i, timestamp: timestamps.get(i.blockNumber) }));
}

/**
 * Recent on-chain activity of `user`: purchases, sales, listings, ECO rewards
 * and badges, decoded from Marketplace / PaymentSplitter / ImpactBadge events.
 */
export function useActivityFeed(user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const client = usePublicClient({ chainId });

  return useQuery({
    queryKey: [ACTIVITY_QUERY_KEY, chainId, user],
    queryFn: () =>
      loadActivity(
        client as PublicClient,
        user as Address,
        {
          ...addresses,
          carbonOffset: getCarbonOffsetAddress(chainId),
          questRewards: getQuestRewardsAddress(chainId),
        },
        LOGS_FROM_BLOCK[chainId],
      ),
    enabled: Boolean(user && client),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });
}
