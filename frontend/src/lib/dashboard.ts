// Framework-free helpers for the user dashboard (unit-tested with plain Node).

import { resolveImageUri } from "./marketplace.ts";

/** Mirrors `enum BadgeType` in contracts/src/ImpactBadge.sol. */
export const BADGE_TYPES = [
  {
    value: 0,
    key: "ECO_CHECKIN",
    label: "Eco Check-in",
    icon: "🌿",
    description: "Ủng hộ nghệ nhân địa phương qua giao dịch D2C minh bạch.",
    gradient: "from-emerald-500 via-teal-600 to-emerald-900",
  },
  {
    value: 1,
    key: "ZERO_CARBON",
    label: "Zero Carbon",
    icon: "🌍",
    description: "Lựa chọn sản phẩm địa phương / bù đắp phát thải carbon của chuyến đi.",
    gradient: "from-sky-500 via-cyan-600 to-sky-900",
  },
  {
    value: 2,
    key: "CULTURE_GUARDIAN",
    label: "Culture Guardian",
    icon: "🏮",
    description: "Tham gia trải nghiệm văn hoá, góp phần gìn giữ di sản bản địa.",
    gradient: "from-amber-500 via-orange-600 to-rose-900",
  },
  {
    value: 3,
    key: "COMMUNITY_DONOR",
    label: "Community Donor",
    icon: "🤝",
    description: "Đóng góp vượt ngưỡng vào Quỹ Cộng đồng bảo tồn.",
    gradient: "from-violet-500 via-fuchsia-600 to-violet-900",
  },
] as const;

export type BadgeTypeInfo = (typeof BADGE_TYPES)[number];

export function getBadgeType(value: number): BadgeTypeInfo {
  return BADGE_TYPES.find((t) => t.value === value) ?? BADGE_TYPES[0];
}

export interface BadgeMetadata {
  name?: string;
  description?: string;
  image?: string;
  location?: string;
  action?: string;
  carbonOffset?: string;
}

const MAX_FIELD = 300;

function text(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_FIELD);
  return trimmed || undefined;
}

/**
 * Reads badge metadata in either flat form (`{action, location, carbonOffset}`,
 * as described in PLAN.md) or OpenSea form (`attributes: [{trait_type, value}]`).
 * Returns null when nothing usable is present.
 */
export function normalizeBadgeMetadata(raw: unknown, gateway?: string): BadgeMetadata | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const traits: Record<string, unknown> = {};
  if (Array.isArray(data.attributes)) {
    for (const attr of data.attributes) {
      if (typeof attr !== "object" || attr === null) continue;
      const { trait_type, value } = attr as { trait_type?: unknown; value?: unknown };
      if (typeof trait_type === "string") traits[trait_type.toLowerCase().replace(/[\s_]/g, "")] = value;
    }
  }
  const field = (name: string) => text(data[name]) ?? text(traits[name.toLowerCase()]);

  const meta: BadgeMetadata = {
    name: text(data.name),
    description: text(data.description),
    image: resolveImageUri(data.image, gateway) ?? undefined,
    location: field("location"),
    action: field("action"),
    carbonOffset: field("carbonOffset"),
  };
  return Object.values(meta).some((v) => v !== undefined) ? meta : null;
}

/** Exact decimal formatting of a token amount (no float rounding of large balances). */
export function formatTokenAmount(value: bigint, decimals = 18, maxFractionDigits = 4): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, "0").slice(0, maxFractionDigits);
  fraction = fraction.replace(/0+$/, "");
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${wholeText}${fraction ? `,${fraction}` : ""}`;
}

/** Inclusive [from, to] block windows of at most `chunkSize` blocks, newest first. */
export function getBlockRanges(
  fromBlock: bigint,
  toBlock: bigint,
  chunkSize: bigint,
): { fromBlock: bigint; toBlock: bigint }[] {
  if (chunkSize <= 0n) throw new Error("chunkSize must be positive");
  const ranges: { fromBlock: bigint; toBlock: bigint }[] = [];
  for (let end = toBlock; end >= fromBlock; end -= chunkSize) {
    const start = end - chunkSize + 1n;
    ranges.push({ fromBlock: start < fromBlock ? fromBlock : start, toBlock: end });
  }
  return ranges;
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

// ───────────────────────────── Activity feed ─────────────────────────────

/** A decoded contract event, as returned by viem's getContractEvents. */
export interface ChainEvent {
  eventName: string;
  args: Record<string, unknown>;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
}

export type ActivityKind =
  | "purchase"
  | "sale"
  | "listing"
  | "cancel"
  | "income"
  | "reward"
  | "offset"
  | "quest"
  | "badge";

export interface ActivityItem {
  txHash: `0x${string}`;
  blockNumber: bigint;
  kind: ActivityKind;
  listingId?: bigint;
  /** ETH value: price paid/listed, or the artisan share received. */
  amountWei?: bigint;
  ecoReward?: bigint;
  badges: { tokenId: bigint; badgeType: number }[];
  split?: { artisan: bigint; treasury: bigint; platform: bigint };
  /** Grams of CO₂ offset (kind "offset"). */
  carbonGrams?: bigint;
  /** QuestRewards questId (kind "quest"). */
  questId?: number;
  timestamp?: number;
}

const sameAddress = (a: unknown, b: string) =>
  typeof a === "string" && a.toLowerCase() === b.toLowerCase();

/**
 * Groups the user's events by transaction (a purchase emits ListingPurchased,
 * PaymentSplit, EcoRewarded and BadgeMinted in one tx) into feed items, newest first.
 */
export function buildActivityFeed(events: ChainEvent[], user: string): ActivityItem[] {
  const byTx = new Map<string, ChainEvent[]>();
  for (const event of events) {
    const group = byTx.get(event.transactionHash) ?? [];
    // The same log can arrive twice (e.g. a purchase matched by buyer and seller filters).
    if (!group.some((e) => e.logIndex === event.logIndex)) group.push(event);
    byTx.set(event.transactionHash, group);
  }

  const items: ActivityItem[] = [];
  for (const group of byTx.values()) {
    const find = (name: string, pred: (e: ChainEvent) => boolean = () => true) =>
      group.find((e) => e.eventName === name && pred(e));

    const bought = find("ListingPurchased", (e) => sameAddress(e.args.buyer, user));
    const sold = find("ListingPurchased", (e) => sameAddress(e.args.seller, user));
    const created = find("ListingCreated");
    const cancelled = find("ListingCancelled");
    const splitEvent = find("PaymentSplit");
    const reward = find("EcoRewarded", (e) => sameAddress(e.args.visitor, user));
    const offset = find("CarbonOffsetted", (e) => sameAddress(e.args.user, user));
    const quest = find("QuestCompleted", (e) => sameAddress(e.args.user, user));
    const badges = group
      .filter((e) => e.eventName === "BadgeMinted" && sameAddress(e.args.to, user))
      .map((e) => ({ tokenId: e.args.tokenId as bigint, badgeType: Number(e.args.badgeType) }));

    const split = splitEvent
      ? {
          artisan: splitEvent.args.artisanAmt as bigint,
          treasury: splitEvent.args.treasuryAmt as bigint,
          platform: splitEvent.args.platformAmt as bigint,
        }
      : undefined;

    const base = {
      txHash: group[0].transactionHash,
      blockNumber: group[0].blockNumber,
      ecoReward: reward ? (reward.args.amount as bigint) : undefined,
      badges,
    };

    if (bought) {
      items.push({
        ...base,
        kind: "purchase",
        listingId: bought.args.listingId as bigint,
        amountWei: bought.args.price as bigint,
        split,
      });
    } else if (sold) {
      items.push({
        ...base,
        kind: "sale",
        listingId: sold.args.listingId as bigint,
        amountWei: split?.artisan ?? (sold.args.price as bigint),
        split,
      });
    } else if (created) {
      items.push({
        ...base,
        kind: "listing",
        listingId: created.args.listingId as bigint,
        amountWei: created.args.price as bigint,
      });
    } else if (cancelled) {
      items.push({ ...base, kind: "cancel", listingId: cancelled.args.listingId as bigint });
    } else if (offset) {
      items.push({
        ...base,
        kind: "offset",
        amountWei: offset.args.paid as bigint,
        carbonGrams: offset.args.carbonGrams as bigint,
      });
    } else if (quest) {
      const ecoReward = quest.args.ecoReward as bigint;
      items.push({
        ...base,
        kind: "quest",
        questId: Number(quest.args.questId),
        ecoReward: ecoReward > 0n ? ecoReward : undefined,
      });
    } else if (splitEvent && sameAddress(splitEvent.args.artisan, user)) {
      items.push({ ...base, kind: "income", amountWei: split?.artisan, split });
    } else if (reward) {
      items.push({ ...base, kind: "reward" });
    } else if (badges.length > 0) {
      items.push({ ...base, kind: "badge" });
    }
  }

  return items.sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1));
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
