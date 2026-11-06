"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Address, PublicClient } from "viem";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import {
  getQuestRewardsAddress,
  GovernanceABI,
  ImpactBadgeABI,
  LOGS_FROM_BLOCK,
  QuestRewardsABI,
} from "@/config/contracts";
import { QUESTS, type QuestDefinition } from "@/data/quests";
import {
  computeQuestProgress,
  HERITAGE_VIEWS_EVENT,
  HERITAGE_VIEWS_KEY,
  parseViewedHeritage,
  readViewedHeritageRaw,
  type OnChainBadgeInfo,
  type QuestProgress,
} from "@/lib/quests";
import { getEventsChunked } from "./useActivityFeed";
import { useActiveChain } from "./useActiveChain";
import { useCarbonOffset } from "./useCarbonOffset";

const REFRESH_MS = 30_000;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

export interface QuestWithProgress extends QuestDefinition {
  progress: QuestProgress;
}

function subscribeHeritage(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === HERITAGE_VIEWS_KEY) onChange();
  };
  window.addEventListener(HERITAGE_VIEWS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HERITAGE_VIEWS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Heritage items opened in the 360° viewer on this browser (local state). */
export function useViewedHeritage(): string[] {
  const raw = useSyncExternalStore(subscribeHeritage, readViewedHeritageRaw, () => null);
  return useMemo(() => parseViewedHeritage(raw), [raw]);
}

/**
 * Progress of every Eco Quest for `user`, from on-chain state (purchase badges,
 * CarbonOffset stats, Governance votes, QuestRewards.completedOf) and local state
 * (heritage items viewed). `address` is undefined when QuestRewards isn't deployed
 * on the active chain.
 */
export function useQuestProgress(user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const client = usePublicClient({ chainId });
  const address = getQuestRewardsAddress(chainId);
  const viewedHeritageIds = useViewedHeritage();
  const carbon = useCarbonOffset(user);

  const completedQuery = useReadContract({
    address,
    abi: QuestRewardsABI,
    functionName: "completedOf",
    args: [user ?? ZERO],
    chainId,
    query: { enabled: Boolean(address && user), refetchInterval: REFRESH_MS },
  });

  const idsQuery = useReadContract({
    address: addresses.impactBadge,
    abi: ImpactBadgeABI,
    functionName: "getBadgesByOwner",
    args: [user ?? ZERO],
    chainId,
    query: { enabled: Boolean(user), refetchInterval: REFRESH_MS },
  });
  const badgeIds = useMemo(() => (idsQuery.data as readonly bigint[] | undefined) ?? [], [idsQuery.data]);

  const badgesQuery = useReadContracts({
    contracts: badgeIds.map((id) => ({
      address: addresses.impactBadge,
      abi: ImpactBadgeABI,
      functionName: "getBadge",
      args: [id],
      chainId,
    })),
    query: { enabled: badgeIds.length > 0 },
  });

  const badges = useMemo<OnChainBadgeInfo[] | undefined>(() => {
    if (!user || idsQuery.data === undefined) return undefined;
    if (badgeIds.length === 0) return [];
    if (!badgesQuery.data) return undefined;
    return badgeIds.flatMap((tokenId, i) => {
      const r = badgesQuery.data?.[i];
      if (r?.status !== "success") return [];
      const b = r.result as { badgeType: number; recipient: Address };
      return [{ tokenId, badgeType: Number(b.badgeType), recipient: b.recipient }];
    });
  }, [user, idsQuery.data, badgeIds, badgesQuery.data]);

  const votesQuery = useQuery({
    queryKey: ["quest-votes", chainId, user],
    queryFn: async () => {
      const c = client as PublicClient;
      const fromBlocks = LOGS_FROM_BLOCK[chainId];
      const events = await getEventsChunked(
        c,
        {
          address: addresses.governance,
          abi: GovernanceABI,
          eventName: "VoteCast",
          args: { voter: user },
          fromBlock: fromBlocks.governance ?? fromBlocks.impactBadge,
        },
        await c.getBlockNumber({ cacheTime: 0 }),
      );
      return [...new Set(events.map((e) => e.args.proposalId as bigint))];
    },
    enabled: Boolean(user && client),
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });

  const completed = completedQuery.data as readonly boolean[] | undefined;

  const quests = useMemo<QuestWithProgress[]>(
    () =>
      QUESTS.map((quest) => ({
        ...quest,
        progress: computeQuestProgress(
          quest,
          {
            badges,
            offsetCount: carbon.offsetCount,
            offsetGrams: carbon.offsetGrams,
            votedProposalIds: votesQuery.data,
            viewedHeritageIds,
          },
          user ?? ZERO,
          address && user ? completed?.[quest.id] : false,
        ),
      })),
    [badges, carbon.offsetCount, carbon.offsetGrams, votesQuery.data, viewedHeritageIds, user, address, completed],
  );

  return {
    address,
    quests,
    completedCount: quests.filter((q) => q.progress.state === "completed").length,
    isError: Boolean(completedQuery.error || idsQuery.error || votesQuery.error),
    refetch: () => {
      void completedQuery.refetch();
      void idsQuery.refetch();
      void votesQuery.refetch();
    },
  };
}
