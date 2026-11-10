"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useBlock, useBlockNumber, usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { EcoTokenABI, GovernanceABI, LOGS_FROM_BLOCK } from "@/config/contracts";
import {
  getProposalStatus,
  getRecentProposalIds,
  getVotingPowerState,
  PROPOSALS_PAGE_SIZE,
  parseProposalDescription,
  type OnChainProposal,
  type ProposalStatus,
} from "@/lib/governance";
import { getEventsChunked } from "./useActivityFeed";
import { useActiveChain } from "./useActiveChain";

const REFRESH_MS = 30_000;
const ZERO = "0x0000000000000000000000000000000000000000" as const;
export const PROPOSAL_VOTES_QUERY_KEY = "governance-votes";

export interface Proposal extends OnChainProposal {
  id: bigint;
  title: string;
  body: string;
  status: ProposalStatus;
}

/**
 * Current time in seconds, ticking every `tickMs`. Uses the latest block time when
 * it is ahead of the wall clock (e.g. Anvil after `evm_increaseTime`), because
 * vote()/execute() compare against `block.timestamp`.
 */
export function useChainNow(tickMs = 1_000): number {
  const { chainId } = useActiveChain();
  const block = useBlock({ chainId, query: { refetchInterval: REFRESH_MS } });
  const [wall, setWall] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setWall(Math.floor(Date.now() / 1000)), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);
  const blockTime = block.data ? Number(block.data.timestamp) : 0;
  return Math.max(wall, blockTime);
}

function toProposal(id: bigint, raw: OnChainProposal, now: number, blockNumber?: bigint): Proposal {
  const { title, body } = parseProposalDescription(raw.description);
  return { ...raw, id, title, body, status: getProposalStatus(raw, now, blockNumber) };
}

/** DAO parameters set by the owner: proposal threshold (ECO wei), quorum (bps), voting period (s). */
export function useGovernanceConfig() {
  const { chainId, addresses } = useActiveChain();
  const fields = ["proposalThreshold", "quorumBps", "votingPeriod", "proposalCount"] as const;
  const query = useReadContracts({
    contracts: fields.map((functionName) => ({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName,
      chainId,
    })),
    query: { refetchInterval: REFRESH_MS },
  });
  const value = (i: number) => {
    const row = query.data?.[i];
    return row?.status === "success" && typeof row.result === "bigint" ? row.result : undefined;
  };
  return {
    proposalThreshold: value(0),
    quorumBps: value(1),
    votingPeriod: value(2),
    proposalCount: value(3),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Newest proposals (Governance.getProposal for each ID), with a derived status. */
export function useProposals(limit = PROPOSALS_PAGE_SIZE) {
  const { chainId, addresses } = useActiveChain();
  const config = useGovernanceConfig();
  const now = useChainNow(5_000);
  const { data: blockNumber } = useBlockNumber({ chainId, cacheTime: 0, query: { refetchInterval: REFRESH_MS } });
  const ids = useMemo(
    () => (config.proposalCount !== undefined ? getRecentProposalIds(config.proposalCount, limit) : []),
    [config.proposalCount, limit],
  );

  const query = useReadContracts({
    contracts: ids.map((id) => ({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName: "getProposal",
      args: [id],
      chainId,
    })),
    query: { enabled: ids.length > 0, refetchInterval: REFRESH_MS },
  });

  const proposals = useMemo<Proposal[]>(
    () =>
      (query.data ?? []).flatMap((row, i) =>
        row.status === "success" && row.result ? [toProposal(ids[i], row.result as OnChainProposal, now, blockNumber)] : [],
      ),
    [query.data, ids, now, blockNumber],
  );

  return {
    config,
    proposals,
    hasMore: config.proposalCount !== undefined && BigInt(ids.length) < config.proposalCount,
    isLoading: config.isLoading || (ids.length > 0 && query.isLoading),
    isError: config.isError || query.isError,
    refetch: () => {
      void config.refetch();
      void query.refetch();
    },
  };
}

/** One proposal plus the connected wallet's vote status and voting power at its snapshot. */
export function useProposal(id: bigint | null, user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const now = useChainNow();
  const { data: blockNumber } = useBlockNumber({ chainId, cacheTime: 0, query: { refetchInterval: REFRESH_MS } });

  const proposalQuery = useReadContract({
    address: addresses.governance,
    abi: GovernanceABI,
    functionName: "getProposal",
    args: [id ?? 0n],
    chainId,
    query: { enabled: id !== null, refetchInterval: REFRESH_MS, retry: 1 },
  });
  const raw = proposalQuery.data as OnChainProposal | undefined;

  const userQuery = useReadContracts({
    contracts: [
      {
        address: addresses.governance,
        abi: GovernanceABI,
        functionName: "hasVoted",
        args: [id ?? 0n, user ?? ZERO],
        chainId,
      },
      {
        address: addresses.ecoToken,
        abi: EcoTokenABI,
        functionName: "getPastVotes",
        args: [user ?? ZERO, raw?.snapshotBlock ?? 0n],
        chainId,
      },
    ],
    query: { enabled: Boolean(id !== null && user && raw), refetchInterval: REFRESH_MS },
  });
  const hasVotedRow = userQuery.data?.[0];
  const powerRow = userQuery.data?.[1];

  return {
    proposal: id !== null && raw ? toProposal(id, raw, now, blockNumber) : undefined,
    now,
    hasVoted: hasVotedRow?.status === "success" ? (hasVotedRow.result as boolean) : undefined,
    /** Voting power of `user` at the proposal's snapshot block (what vote() counts). */
    votingPowerAtSnapshot: powerRow?.status === "success" ? (powerRow.result as bigint) : undefined,
    isLoading: proposalQuery.isLoading,
    /** Reverts with ProposalNotFound for unknown IDs. */
    notFound: proposalQuery.isError && /ProposalNotFound/.test(String(proposalQuery.error)),
    isError: proposalQuery.isError,
    refetch: () => {
      void proposalQuery.refetch();
      void userQuery.refetch();
    },
  };
}

/** ECO balance, current votes and delegate of `user` (ERC20Votes needs delegate() to count). */
export function useVotingPower(user: Address | undefined) {
  const { chainId, addresses } = useActiveChain();
  const fn = (functionName: "balanceOf" | "getVotes" | "delegates") => ({
    address: addresses.ecoToken,
    abi: EcoTokenABI,
    functionName,
    args: [user ?? ZERO],
    chainId,
  });
  const query = useReadContracts({
    contracts: [fn("balanceOf"), fn("getVotes"), fn("delegates")],
    query: { enabled: Boolean(user), refetchInterval: REFRESH_MS },
  });
  const [balanceRow, votesRow, delegateRow] = query.data ?? [];
  const balance = balanceRow?.status === "success" ? (balanceRow.result as bigint) : undefined;
  const votes = votesRow?.status === "success" ? (votesRow.result as bigint) : undefined;
  const delegatee = delegateRow?.status === "success" ? (delegateRow.result as Address) : undefined;

  return {
    balance,
    votes,
    delegatee,
    state:
      user && balance !== undefined && votes !== undefined && delegatee !== undefined
        ? getVotingPowerState({ user, balance, votes, delegatee })
        : undefined,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export interface ProposalVote {
  voter: Address;
  support: boolean;
  weight: bigint;
  transactionHash: Hash;
  blockNumber: bigint;
}

/** VoteCast events of one proposal, newest first. */
export function useProposalVotes(id: bigint | null) {
  const { chainId, addresses } = useActiveChain();
  const client = usePublicClient({ chainId });
  const fromBlocks = LOGS_FROM_BLOCK[chainId];
  const fromBlock = fromBlocks.governance ?? fromBlocks.impactBadge;

  return useQuery({
    queryKey: [PROPOSAL_VOTES_QUERY_KEY, chainId, addresses.governance, id?.toString()],
    enabled: Boolean(client && id !== null),
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<ProposalVote[]> => {
      if (!client || id === null) return [];
      // cacheTime 0: viem caches the block number for 4 s, which would miss a vote mined just now.
      const latest = await client.getBlockNumber({ cacheTime: 0 });
      const events = await getEventsChunked(
        client,
        { address: addresses.governance, abi: GovernanceABI, eventName: "VoteCast", args: { proposalId: id }, fromBlock },
        latest,
      );
      return events
        .map((e) => {
          const args = e.args as { voter: Address; support: boolean; weight: bigint };
          return {
            voter: args.voter,
            support: args.support,
            weight: args.weight,
            transactionHash: e.transactionHash as Hash,
            blockNumber: e.blockNumber,
          };
        })
        .sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1));
    },
  });
}
