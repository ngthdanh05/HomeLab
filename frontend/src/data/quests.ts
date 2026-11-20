// Eco Quest definitions (Task 4.4). Index = on-chain questId: keep in sync with
// contracts/script/QuestSetup.sol (rewards and targets are enforced on-chain).
import type { Locale } from "../lib/i18n.ts";
import { HERITAGE_IDS } from "./heritage.ts";
import type { IconName } from "../lib/icon-names.ts";

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
  icon: IconName;
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
    title: "Lần đầu ủng hộ nghệ nhân làng chài",
    description: "Mua một món thủ công biển (vỏ ốc, gốm biển…) trực tiếp trên Chợ làng chài.",
    icon: "quest-first-craft",
    kind: "handicraft-purchases",
    target: 1,
    ecoReward: 10,
    action: { href: "/marketplace", label: "Tới Chợ làng chài" },
  },
  {
    id: 1,
    key: "artisan-patron",
    title: "Người bảo trợ làng chài",
    description: "Mua 3 món thủ công biển trực tiếp từ nghệ nhân ven biển.",
    icon: "quest-three-crafts",
    kind: "handicraft-purchases",
    target: 3,
    ecoReward: 30,
    rewardBadgeType: 2, // CULTURE_GUARDIAN
    action: { href: "/marketplace", label: "Tới Chợ làng chài" },
  },
  {
    id: 2,
    key: "first-offset",
    title: "Chuyến ra biển trung hoà carbon",
    description: "Bù đắp CO₂ của chặng di chuyển ra đảo, ra biển tại Hành trình xanh.",
    icon: "quest-first-offset",
    kind: "carbon-offsets",
    target: 1,
    ecoReward: 0,
    rewardBadgeType: 3, // COMMUNITY_DONOR
    action: { href: "/carbon-tracker", label: "Tới Hành trình xanh" },
  },
  {
    id: 3,
    key: "climate-hero",
    title: "Người hùng khí hậu đại dương",
    description: "Bù đắp tổng cộng từ 100 kg CO₂ trở lên cho các chuyến đi biển.",
    icon: "quest-offset-100kg",
    kind: "carbon-grams",
    target: 100_000,
    ecoReward: 0,
    rewardBadgeType: 1, // ZERO_CARBON
    action: { href: "/carbon-tracker", label: "Tới Hành trình xanh" },
  },
  {
    id: 4,
    key: "dao-voter",
    title: "Tiếng nói cho đại dương",
    description: "Bỏ phiếu cho một dự án phục hồi san hô hoặc làm sạch biển của Quỹ bảo tồn biển.",
    icon: "quest-dao-vote",
    kind: "dao-vote",
    target: 1,
    ecoReward: 0,
    rewardBadgeType: 3, // COMMUNITY_DONOR
    action: { href: "/governance", label: "Tới Quỹ bảo tồn biển" },
  },
  {
    id: 5,
    key: "heritage-explorer",
    title: "Nhà thám hiểm di sản biển",
    description: `Mở và khám phá cả ${HERITAGE_IDS.length} di sản biển số hoá 360°.`,
    icon: "quest-heritage-360",
    kind: "heritage-views",
    target: HERITAGE_IDS.length,
    // ECO is DAO voting power: only purchase quests mint it (QuestRewards.addQuest).
    ecoReward: 0,
    rewardBadgeType: 2, // CULTURE_GUARDIAN
    action: { href: "/heritage", label: "Mở Di sản biển 360°" },
  },
];

const QUESTS_EN: Record<string, { title: string; description: string; actionLabel: string }> = {
  "first-handicraft": {
    title: "First fishing-village support",
    description: "Buy one sea craft (shells, sea pottery…) directly on the Village Market.",
    actionLabel: "Go to the Village Market",
  },
  "artisan-patron": {
    title: "Fishing village patron",
    description: "Buy 3 sea crafts directly from coastal artisans.",
    actionLabel: "Go to the Village Market",
  },
  "first-offset": {
    title: "Carbon-neutral trip to the sea",
    description: "Offset the CO₂ of getting to the island or coast on Green Journey.",
    actionLabel: "Go to Green Journey",
  },
  "climate-hero": {
    title: "Ocean climate hero",
    description: "Offset 100 kg of CO₂ or more in total for your sea trips.",
    actionLabel: "Go to Green Journey",
  },
  "dao-voter": {
    title: "A voice for the ocean",
    description: "Vote on a coral restoration or ocean clean-up project of the Ocean Conservation Fund.",
    actionLabel: "Go to the Ocean Conservation Fund",
  },
  "heritage-explorer": {
    title: "Ocean heritage explorer",
    description: `Open and explore all ${HERITAGE_IDS.length} digitized 360° ocean heritage sites.`,
    actionLabel: "Open 360° ocean heritage",
  },
};

/**
 * Hành trình du khách biển: thứ tự hiển thị nhiệm vụ (khác `id` on-chain).
 * Trước chuyến đi → trên đường ra biển → tại làng chài → sau chuyến đi.
 */
export const JOURNEY_STAGES = [
  { key: "before", label: "Trước chuyến đi", labelEn: "Before the trip", questKeys: ["heritage-explorer"] },
  { key: "travel", label: "Trên đường ra biển", labelEn: "Getting to the coast", questKeys: ["first-offset", "climate-hero"] },
  { key: "village", label: "Tại làng chài", labelEn: "In the fishing village", questKeys: ["first-handicraft", "artisan-patron"] },
  { key: "after", label: "Sau chuyến đi", labelEn: "After the trip", questKeys: ["dao-voter"] },
] as const;

export type JourneyStageKey = (typeof JOURNEY_STAGES)[number]["key"];

/** Nhiệm vụ theo thứ tự hành trình. */
export function sortByJourney<T extends Pick<QuestDefinition, "key">>(quests: readonly T[]): T[] {
  const order: string[] = JOURNEY_STAGES.flatMap((s) => [...s.questKeys]);
  const rank = (q: T) => (order.indexOf(q.key) === -1 ? order.length : order.indexOf(q.key));
  return [...quests].sort((a, b) => rank(a) - rank(b));
}

/** The quest with its text in `locale`. */
export function localizeQuest<T extends QuestDefinition>(quest: T, locale: Locale): T {
  const en = QUESTS_EN[quest.key];
  if (locale !== "en" || !en) return quest;
  return { ...quest, title: en.title, description: en.description, action: { ...quest.action, label: en.actionLabel } };
}

export function getQuest(id: number): QuestDefinition | undefined {
  return QUESTS.find((q) => q.id === id);
}
