// Framework-free Eco Quest helpers (unit-tested with plain Node).
import { HERITAGE_IDS } from "../data/heritage.ts";
import type { QuestDefinition } from "../data/quests.ts";

/** ImpactBadge.BadgeType.ECO_CHECKIN: minted by the Marketplace for handicraft purchases. */
export const HANDICRAFT_BADGE_TYPE = 0;

export interface OnChainBadgeInfo {
  tokenId: bigint;
  badgeType: number;
  /** Original recipient (Badge.recipient); does not change when the NFT is transferred. */
  recipient: string;
}

/** Everything the quest progress is computed from. Undefined = not loaded yet. */
export interface QuestStats {
  badges?: readonly OnChainBadgeInfo[];
  offsetCount?: bigint;
  offsetGrams?: bigint;
  /** Proposal IDs the user voted on (from Governance VoteCast events). */
  votedProposalIds?: readonly bigint[];
  viewedHeritageIds: readonly string[];
}

export type QuestState = "loading" | "in-progress" | "ready" | "completed";

export interface QuestProgress {
  current: number;
  target: number;
  /** 0–1, for progress bars. */
  ratio: number;
  state: QuestState;
  /** Arguments for QuestRewards.claim(questId, proofIds) when ready. */
  proofIds: bigint[];
}

/**
 * Handicraft-purchase badges usable as proof: ECO_CHECKIN badges whose original
 * recipient is `user`, ascending (the contract requires strictly increasing IDs).
 */
export function handicraftProofIds(badges: readonly OnChainBadgeInfo[], user: string): bigint[] {
  const ids = badges
    .filter((b) => b.badgeType === HANDICRAFT_BADGE_TYPE && b.recipient.toLowerCase() === user.toLowerCase())
    .map((b) => b.tokenId);
  return [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function progress(current: number, target: number, proofIds: bigint[] = []): QuestProgress {
  const done = current >= target;
  return {
    current: Math.min(current, target),
    target,
    ratio: target > 0 ? Math.min(1, current / target) : 1,
    state: done ? "ready" : "in-progress",
    proofIds,
  };
}

const LOADING = (target: number): QuestProgress => ({
  current: 0,
  target,
  ratio: 0,
  state: "loading",
  proofIds: [],
});

/** Progress of one quest for `user`; `completed` comes from QuestRewards.completedOf. */
export function computeQuestProgress(
  quest: QuestDefinition,
  stats: QuestStats,
  user: string,
  completed: boolean | undefined,
): QuestProgress {
  if (completed) {
    return { current: quest.target, target: quest.target, ratio: 1, state: "completed", proofIds: [] };
  }

  let result: QuestProgress;
  switch (quest.kind) {
    case "handicraft-purchases": {
      if (!stats.badges) return LOADING(quest.target);
      const ids = handicraftProofIds(stats.badges, user);
      result = progress(ids.length, quest.target, ids.slice(0, quest.target));
      break;
    }
    case "carbon-offsets":
      if (stats.offsetCount === undefined) return LOADING(quest.target);
      result = progress(Number(stats.offsetCount), quest.target);
      break;
    case "carbon-grams":
      if (stats.offsetGrams === undefined) return LOADING(quest.target);
      result = progress(Number(stats.offsetGrams), quest.target);
      break;
    case "dao-vote": {
      if (!stats.votedProposalIds) return LOADING(quest.target);
      const [proposalId] = stats.votedProposalIds;
      result = progress(stats.votedProposalIds.length, quest.target, proposalId === undefined ? [] : [proposalId]);
      break;
    }
    case "heritage-views": {
      const viewed = stats.viewedHeritageIds.filter((id) => HERITAGE_IDS.includes(id));
      result = progress(new Set(viewed).size, quest.target);
      break;
    }
  }
  // completedOf not loaded yet: don't offer a claim that may already be done.
  return completed === undefined && result.state === "ready" ? { ...result, state: "loading" } : result;
}

/** Human-readable "current / target" for a quest kind. */
export function formatQuestCount(quest: QuestDefinition, value: number): string {
  if (quest.kind === "carbon-grams") {
    return `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg`;
  }
  return value.toLocaleString("vi-VN");
}

// ─────────────────────── Heritage views (localStorage) ───────────────────────

export const HERITAGE_VIEWS_KEY = "myhomelab.quests.heritage-viewed";
/** Fired on window when the viewed list changes (storage events only fire in other tabs). */
export const HERITAGE_VIEWS_EVENT = "myhomelab:heritage-viewed";

/** Parses the stored list, keeping only known heritage IDs (storage is user-editable). */
export function parseViewedHeritage(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === "string" && HERITAGE_IDS.includes(v)))];
  } catch {
    return [];
  }
}

/** Reads the raw stored value; null when storage is unavailable. */
export function readViewedHeritageRaw(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(HERITAGE_VIEWS_KEY);
  } catch {
    return null;
  }
}

/** Records that a heritage item was opened in the 360° viewer. */
export function markHeritageViewed(id: string): void {
  if (typeof window === "undefined" || !HERITAGE_IDS.includes(id)) return;
  const viewed = parseViewedHeritage(readViewedHeritageRaw());
  if (viewed.includes(id)) return;
  try {
    window.localStorage.setItem(HERITAGE_VIEWS_KEY, JSON.stringify([...viewed, id]));
    window.dispatchEvent(new Event(HERITAGE_VIEWS_EVENT));
  } catch {
    // Storage blocked (private mode): the quest simply can't track views.
  }
}
