// Eco Quest definitions (Task 4.4). Index = on-chain questId: keep in sync with
// contracts/script/QuestSetup.sol (rewards and targets are enforced on-chain).
import type { Locale } from "../lib/i18n.ts";
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
    action: { href: "/", label: "Trang chủ → tab Di sản số 360°" },
  },
];

const QUESTS_EN: Record<string, { title: string; description: string; actionLabel: string }> = {
  "first-handicraft": {
    title: "First artisan support",
    description: "Buy one handicraft on the D2C Marketplace.",
    actionLabel: "Go to Marketplace",
  },
  "artisan-patron": {
    title: "Artisan patron",
    description: "Buy 3 handicrafts directly from local artisans.",
    actionLabel: "Go to Marketplace",
  },
  "first-offset": {
    title: "First carbon offset",
    description: "Offset the CO₂ emissions of a trip on the Carbon Tracker.",
    actionLabel: "Go to Carbon Tracker",
  },
  "climate-hero": {
    title: "Climate hero",
    description: "Offset 100 kg of CO₂ or more in total.",
    actionLabel: "Go to Carbon Tracker",
  },
  "dao-voter": {
    title: "Community voice",
    description: "Vote on a disbursement proposal of the Community Treasury DAO.",
    actionLabel: "View ECO balance",
  },
  "heritage-explorer": {
    title: "Heritage explorer",
    description: `Open and explore all ${HERITAGE_IDS.length} digitized 360° heritage sites.`,
    actionLabel: "Home → 360° Heritage tab",
  },
};

/** The quest with its text in `locale`. */
export function localizeQuest<T extends QuestDefinition>(quest: T, locale: Locale): T {
  const en = QUESTS_EN[quest.key];
  if (locale !== "en" || !en) return quest;
  return { ...quest, title: en.title, description: en.description, action: { ...quest.action, label: en.actionLabel } };
}

export function getQuest(id: number): QuestDefinition | undefined {
  return QUESTS.find((q) => q.id === id);
}
