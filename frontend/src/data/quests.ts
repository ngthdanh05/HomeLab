// Eco Quest definitions (Task 4.4). Index = on-chain questId: keep in sync with
// contracts/script/QuestSetup.sol (rewards and targets are enforced on-chain).
import { HERITAGE_IDS } from "./heritage.ts";

/** Mirrors `enum Requirement` in contracts/src/QuestRewards.sol. */
export const REQUIREMENT = {
  BADGES_OF_TYPE: 0,
  OFFSET_COUNT: 1,
  OFFSET_GRAMS: 2,
  DAO_VOTE: 3,
  SELF_ATTESTED: 4,
} as const;

export type QuestKind =
  | "handicraft-purchases"
  | "carbon-offsets"
  | "carbon-grams"
  | "dao-vote"
  | "heritage-views";

export interface QuestDefinition {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: string;
  kind: QuestKind;
  /** Amount to reach, in the unit of `kind` (purchases, offsets, grams, votes, heritage items). */
  target: number;
  /** Whole ECO tokens minted on claim. */
  ecoReward: number;
  /** ImpactBadge.BadgeType minted on claim, if any. */
  rewardBadgeType?: number;
  /** Where to go to make progress. */
  action: { href: string; label: string };
}

export const QUESTS: readonly QuestDefinition[] = [
  {
    id: 0,
    key: "first-handicraft",
    title: "Lần đầu ủng hộ nghệ nhân",
    description: "Mua một sản phẩm thủ công trên Marketplace D2C.",
    icon: "🧺",
    kind: "handicraft-purchases",
    target: 1,
    ecoReward: 10,
    action: { href: "/marketplace", label: "Tới Marketplace" },
  },
  {
    id: 1,
    key: "artisan-patron",
    title: "Người bảo trợ nghệ nhân",
    description: "Mua 3 sản phẩm thủ công trực tiếp từ nghệ nhân địa phương.",
    icon: "🏺",
    kind: "handicraft-purchases",
    target: 3,
    ecoReward: 30,
    rewardBadgeType: 2, // CULTURE_GUARDIAN
    action: { href: "/marketplace", label: "Tới Marketplace" },
  },
  {
    id: 2,
    key: "first-offset",
    title: "Carbon offset lần đầu",
    description: "Bù đắp phát thải CO₂ của một chuyến đi trên Carbon Tracker.",
    icon: "🌍",
    kind: "carbon-offsets",
    target: 1,
    ecoReward: 0,
    rewardBadgeType: 3, // COMMUNITY_DONOR
    action: { href: "/carbon-tracker", label: "Tới Carbon Tracker" },
  },
  {
    id: 3,
    key: "climate-hero",
    title: "Người hùng khí hậu",
    description: "Bù đắp tổng cộng từ 100 kg CO₂ trở lên.",
    icon: "🌳",
    kind: "carbon-grams",
    target: 100_000,
    ecoReward: 0,
    rewardBadgeType: 1, // ZERO_CARBON
    action: { href: "/carbon-tracker", label: "Tới Carbon Tracker" },
  },
  {
    id: 4,
    key: "dao-voter",
    title: "Tiếng nói cộng đồng",
    description: "Biểu quyết một đề xuất giải ngân của DAO Quỹ Cộng đồng.",
    icon: "🗳️",
    kind: "dao-vote",
    target: 1,
    ecoReward: 0,
    rewardBadgeType: 3, // COMMUNITY_DONOR
    action: { href: "/dashboard", label: "Xem số dư ECO" },
  },
  {
    id: 5,
    key: "heritage-explorer",
    title: "Nhà thám hiểm di sản",
    description: `Mở và khám phá cả ${HERITAGE_IDS.length} di sản số hoá 360°.`,
    icon: "🏛️",
    kind: "heritage-views",
    target: HERITAGE_IDS.length,
    // ECO is DAO voting power: only purchase quests mint it (QuestRewards.addQuest).
    ecoReward: 0,
    rewardBadgeType: 2, // CULTURE_GUARDIAN
    action: { href: "/", label: "Trang chủ → tab 360° Digital Archive" },
  },
];

export function getQuest(id: number): QuestDefinition | undefined {
  return QUESTS.find((q) => q.id === id);
}
