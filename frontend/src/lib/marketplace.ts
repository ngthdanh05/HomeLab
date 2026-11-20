// Framework-free helpers for the D2C marketplace (unit-tested with plain Node).

import { intlLocale, pick, type Locale } from "./i18n.ts";

/** Mirrors `enum ProductType` in contracts/src/interfaces/IMarketPlaceDeps.sol. */
export const PRODUCT_TYPES = [
  {
    value: 0,
    label: "Thủ công vỏ ốc & gốm biển",
    labelEn: "Shell crafts & sea pottery",
    shortLabel: "Thủ công biển",
    shortLabelEn: "Sea crafts",
    icon: "handicraft",
  },
  {
    value: 1,
    label: "Đặc sản làng chài",
    labelEn: "Fishing village specialties",
    shortLabel: "Đặc sản",
    shortLabelEn: "Specialties",
    icon: "food",
  },
  {
    value: 2,
    label: "Tour lặn & Trải nghiệm sinh thái",
    labelEn: "Dive & eco-experience tours",
    shortLabel: "Tour & trải nghiệm",
    shortLabelEn: "Tours",
    icon: "experience",
  },
] as const;

export type ProductTypeValue = (typeof PRODUCT_TYPES)[number]["value"];

export function getProductType(value: number) {
  return PRODUCT_TYPES.find((t) => t.value === value) ?? PRODUCT_TYPES[0];
}

export interface Listing {
  id: bigint;
  seller: `0x${string}`;
  price: bigint;
  pType: number;
  metadataURI: string;
  isActive: boolean;
}

/** Mirrors `enum OrderStatus` in contracts/src/Marketplace.sol. */
export const ORDER_STATUS = { none: 0, paid: 1, disputed: 2, released: 3, refunded: 4 } as const;

export interface Order {
  buyer: `0x${string}`;
  paidAt: bigint;
  disputedAt: bigint;
  status: number;
  price: bigint;
}

/** What `user` can do with an order right now (the contract enforces the same rules). */
export function getOrderActions(input: {
  order: Order;
  seller: string;
  arbiter: string | undefined;
  user: string | undefined;
  now: number;
  escrowPeriod: bigint | undefined;
}) {
  const { order, seller, arbiter, now, escrowPeriod } = input;
  const user = input.user?.toLowerCase();
  const isBuyer = Boolean(user) && user === order.buyer.toLowerCase();
  const isSeller = Boolean(user) && user === seller.toLowerCase();
  const isArbiter = Boolean(user) && user === arbiter?.toLowerCase();
  const paid = order.status === ORDER_STATUS.paid;
  const disputed = order.status === ORDER_STATUS.disputed;
  return {
    canConfirm: paid && isBuyer,
    canDispute: paid && isBuyer,
    canRefund: (paid || disputed) && isSeller,
    canRelease: paid && escrowPeriod !== undefined && BigInt(Math.floor(now)) >= order.paidAt + escrowPeriod,
    canResolve: disputed && isArbiter,
  };
}

/** Message the seller signs to upload listing data to IPFS. */
export function buildUploadMessage(address: string, timestampMs: number, locale: Locale = "vi"): string {
  const wallet = address.toLowerCase();
  return pick(
    locale,
    `San Hô Xanh: tải dữ liệu sản phẩm lên IPFS\nVí: ${wallet}\nThời điểm: ${timestampMs}`,
    `BlueReef Travel: upload listing data to IPFS\nWallet: ${wallet}\nTimestamp: ${timestampMs}`,
  );
}

export const UPLOAD_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export function isFreshUploadTimestamp(timestampMs: number, now = Date.now()): boolean {
  return Number.isSafeInteger(timestampMs) && Math.abs(now - timestampMs) <= UPLOAD_SIGNATURE_MAX_AGE_MS;
}

export interface ListingMetadata {
  name: string;
  description: string;
  image?: string;
  /** Tên nghệ nhân / ngư dân hiển thị thay cho địa chỉ ví. */
  artisan?: string;
  /** Làng chài / địa phương. */
  village?: string;
  /** Kênh liên hệ công khai của người bán (Zalo, điện thoại, email…) để hẹn giao hàng off-chain. */
  contact?: string;
  /** Lịch khởi hành / giờ đón khách của tour. */
  schedule?: string;
}

/** ProductType.Experience: đơn của loại này là lịch đặt tour. */
export const EXPERIENCE_TYPE = 2;

export interface SplitShares {
  artisanBPS: number;
  treasuryBPS: number;
  platformBPS: number;
}

export const DEFAULT_SHARES: SplitShares = {
  artisanBPS: 7000,
  treasuryBPS: 2000,
  platformBPS: 1000,
};

export const BPS_DENOMINATOR = 10_000;

export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

/** Max listings fetched in one page, newest first. */
export const LISTINGS_PAGE_SIZE = 60;

/** IDs to fetch for the newest `limit` listings (IDs start at 1). */
export function getRecentListingIds(nextListingId: bigint, limit = LISTINGS_PAGE_SIZE): bigint[] {
  const ids: bigint[] = [];
  for (let id = nextListingId - 1n; id >= 1n && ids.length < limit; id--) ids.push(id);
  return ids;
}

/** Splits `price` the same way PaymentSplitter does (platform takes the rounding remainder). */
export function splitPrice(price: bigint, shares: SplitShares) {
  const artisan = (price * BigInt(shares.artisanBPS)) / BigInt(BPS_DENOMINATOR);
  const treasury = (price * BigInt(shares.treasuryBPS)) / BigInt(BPS_DENOMINATOR);
  return { artisan, treasury, platform: price - artisan - treasury };
}

export function formatBps(bps: number, locale: Locale = "vi"): string {
  return `${(bps / 100).toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })}%`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Turns ipfs:// URIs into gateway URLs; returns null for unsupported schemes. */
export function resolveUri(uri: string, gateway = IPFS_GATEWAY): string | null {
  const value = uri.trim();
  if (value.startsWith("ipfs://")) {
    return gateway + value.slice("ipfs://".length).replace(/^ipfs\//, "");
  }
  if (value.startsWith("https://")) return value;
  return null;
}

/**
 * Only image sources we can render safely: https, ipfs, or inline raster images.
 * (Inline SVG is rejected because it can carry scripts.)
 */
export function resolveImageUri(uri: unknown, gateway = IPFS_GATEWAY): string | null {
  if (typeof uri !== "string") return null;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(uri)) return uri;
  return resolveUri(uri, gateway);
}

const MAX_TEXT = { name: 120, description: 2000, detail: 120 } as const;

export const LISTING_DETAIL_FIELDS = ["artisan", "village", "contact", "schedule"] as const;
export type ListingDetailField = (typeof LISTING_DETAIL_FIELDS)[number];

/** Trường phụ ngắn của metadata: gộp khoảng trắng, cắt độ dài, rỗng ⇒ undefined. */
function detailText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT.detail);
  return trimmed || undefined;
}

/** Làm sạch các trường phụ của form đăng bán (cùng quy tắc khi đọc metadata). */
export function normalizeListingDetails(raw: Partial<Record<ListingDetailField, unknown>>) {
  const out: Partial<Record<ListingDetailField, string>> = {};
  for (const field of LISTING_DETAIL_FIELDS) {
    const value = detailText(raw[field]);
    if (value) out[field] = value;
  }
  return out;
}

export function normalizeMetadata(raw: unknown, gateway = IPFS_GATEWAY): ListingMetadata | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim().slice(0, MAX_TEXT.name) : "";
  if (!name) return null;
  return {
    name,
    description:
      typeof data.description === "string"
        ? data.description.trim().slice(0, MAX_TEXT.description)
        : "",
    image: resolveImageUri(data.image, gateway) ?? undefined,
    ...normalizeListingDetails(data),
  };
}

/** "Tên nghệ nhân · Làng chài", hoặc null khi metadata không có cả hai. */
export function formatArtisanLine(metadata: Pick<ListingMetadata, "artisan" | "village"> | null | undefined): string | null {
  const parts = [metadata?.artisan, metadata?.village].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Biến thông tin liên hệ của người bán thành link an toàn: email → mailto:,
 * số điện thoại → tel:, URL https (Zalo, Facebook…) → chính nó. Còn lại hiển thị dạng chữ.
 */
export function contactHref(contact: string | undefined): string | null {
  const value = contact?.trim();
  if (!value) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  const digits = value.replace(/[\s.()-]/g, "");
  if (/^\+?\d{8,15}$/.test(digits)) return `tel:${digits}`;
  if (/^https:\/\/\S+$/i.test(value)) {
    try {
      return new URL(value).protocol === "https:" ? value : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ─────────────────────────────── Đơn hàng ───────────────────────────────

export type OrderRole = "buyer" | "seller";
export type OrderStepKey = "paid" | "received" | "released";
export type OrderStepState = "done" | "current" | "upcoming" | "warning";

export interface OrderStage {
  /** Đã thanh toán → Đã nhận hàng / hoàn thành tour → Đã giải ngân cho người bán. */
  steps: { key: OrderStepKey; state: OrderStepState }[];
  outcome: "escrow" | "disputed" | "completed" | "refunded";
  /** Unix giây: từ thời điểm này ai cũng giải ngân được (chỉ đơn đang giữ tiền). */
  releasableAt?: number;
}

/** Dòng tiến trình của một đơn, suy ra từ trạng thái on-chain. */
export function getOrderStage(order: Pick<Order, "status" | "paidAt">, escrowPeriod: bigint | undefined): OrderStage {
  const steps = (received: OrderStepState, released: OrderStepState) => [
    { key: "paid" as const, state: "done" as const },
    { key: "received" as const, state: received },
    { key: "released" as const, state: released },
  ];
  switch (order.status) {
    case ORDER_STATUS.released:
      return { outcome: "completed", steps: steps("done", "done") };
    case ORDER_STATUS.refunded:
      return { outcome: "refunded", steps: steps("warning", "upcoming") };
    case ORDER_STATUS.disputed:
      return { outcome: "disputed", steps: steps("warning", "upcoming") };
    default:
      return {
        outcome: "escrow",
        steps: steps("current", "upcoming"),
        releasableAt: escrowPeriod !== undefined ? Number(order.paidAt + escrowPeriod) : undefined,
      };
  }
}

/** Ví đang kết nối có việc phải làm với đơn này (hiện ở "Việc cần làm"). */
export function orderNeedsAction(actions: ReturnType<typeof getOrderActions>): boolean {
  return actions.canConfirm || actions.canRelease || actions.canResolve;
}

/** Tin nhắn người mua gửi cho người bán qua kênh off-chain (không ghi dữ liệu cá nhân lên chain). */
export function buildSellerMessage(
  input: { listingId: bigint; listingName: string; note: string; isTour: boolean },
  locale: Locale = "vi",
): string {
  const note = input.note.trim().slice(0, 500);
  const head = pick(
    locale,
    `Xin chào, tôi vừa ${input.isTour ? "đặt tour" : "đặt mua"} "${input.listingName}" (đơn #${input.listingId}) trên San Hô Xanh.`,
    `Hello, I just ${input.isTour ? "booked" : "ordered"} "${input.listingName}" (order #${input.listingId}) on BlueReef Travel.`,
  );
  return note ? `${head}\n${note}` : head;
}

/** Decodes metadata stored inline as `data:application/json;base64,...`. */
export function decodeDataJsonUri(uri: string): unknown {
  const match = /^data:application\/json(?:;charset=utf-8)?;base64,(.+)$/i.exec(uri);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Metadata comes from seller-chosen URIs, so an oversized response is refused. */
const MAX_METADATA_CHARS = 256 * 1024;

/** Fetches JSON metadata from an inline data: URI, ipfs:// or https:// URI. */
export async function fetchJsonUri(
  uri: string,
  gateway = IPFS_GATEWAY,
  timeoutMs = 10_000,
): Promise<unknown> {
  if (uri.startsWith("data:")) return decodeDataJsonUri(uri);
  const url = resolveUri(uri, gateway);
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_METADATA_CHARS) throw new Error("Metadata is too large");
  return JSON.parse(text);
}

export function encodeDataJsonUri(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:application/json;base64,${btoa(binary)}`;
}

export const LISTING_LIMITS = {
  name: MAX_TEXT.name,
  description: MAX_TEXT.description,
  imageBytes: 2 * 1024 * 1024,
} as const;

/** Validates the listing form; returns an error message or null. */
export function validateListingText(name: string, description: string, locale: Locale = "vi"): string | null {
  if (!name.trim()) return pick(locale, "Vui lòng nhập tên sản phẩm.", "Please enter the product name.");
  if (name.length > LISTING_LIMITS.name) {
    return pick(locale, `Tên tối đa ${LISTING_LIMITS.name} ký tự.`, `Name can be at most ${LISTING_LIMITS.name} characters.`);
  }
  if (description.length > LISTING_LIMITS.description) {
    return pick(
      locale,
      `Mô tả tối đa ${LISTING_LIMITS.description} ký tự.`,
      `Description can be at most ${LISTING_LIMITS.description} characters.`,
    );
  }
  return null;
}

/** Detects PNG/JPEG/GIF/WebP from magic bytes (the browser-supplied MIME is untrusted). */
export function detectImageType(bytes: Uint8Array): string | null {
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

/** Friendly Vietnamese messages for Marketplace custom errors and wallet errors. */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  ListingNotActive: "Sản phẩm này đã được bán hoặc đã bị huỷ.",
  ListingNotFound: "Không tìm thấy sản phẩm.",
  InsufficientPayment: "Số ETH gửi không đủ để thanh toán.",
  NotSellerOrOwner: "Chỉ người bán mới có thể huỷ sản phẩm này.",
  ZeroPrice: "Giá phải lớn hơn 0.",
  PriceBelowMinimum: "Giá thấp hơn mức tối thiểu của Chợ làng chài.",
  ArtisanNotVerified: "Ví của bạn chưa được xác thực là nghệ nhân nên chưa thể đăng bán.",
  SelfPurchase: "Bạn không thể mua sản phẩm của chính mình.",
  InvalidOrderStatus: "Đơn hàng không ở trạng thái cho phép thao tác này.",
  NotBuyer: "Chỉ người mua mới thực hiện được thao tác này.",
  NotSeller: "Chỉ người bán mới hoàn tiền được đơn hàng này.",
  NotArbiter: "Chỉ trọng tài mới xử lý được tranh chấp.",
  EscrowNotExpired: "Chưa hết thời hạn giữ tiền của đơn hàng.",
  DisputeNotStale: "Tranh chấp chưa quá hạn xử lý.",
  EnforcedPause: "Nền tảng đang tạm dừng tính năng này để bảo trì an toàn.",
  EmptyMetadataURI: "Thiếu thông tin sản phẩm (metadata).",
  RefundFailed: "Không hoàn lại được tiền thừa cho ví của bạn.",
  // CarbonOffset
  InvalidCarbonAmount: "Lượng CO₂ bù đắp không hợp lệ (từ 1 kg đến 100 tấn mỗi lần).",
  MetadataTooLong: "Thông tin huy hiệu quá dài.",
  AlreadyCompleted: "Bạn đã nhận thưởng nhiệm vụ này rồi.",
  RequirementNotMet: "Chưa đạt điều kiện của nhiệm vụ (dữ liệu có thể chưa cập nhật, hãy thử lại sau ít giây).",
  QuestInactive: "Nhiệm vụ này đang tạm dừng.",
  QuestNotFound: "Không tìm thấy nhiệm vụ.",
  TooManyProofIds: "Quá nhiều huy hiệu bằng chứng trong một lần nhận thưởng.",
  // Governance / CommunityTreasury
  AlreadyVoted: "Bạn đã bỏ phiếu rồi. Mỗi ví chỉ được bỏ phiếu một lần cho mỗi đề xuất.",
  NoVotingPower:
    "Ví không có quyền biểu quyết tại thời điểm tạo đề xuất (cần nắm ECO và kích hoạt quyền bỏ phiếu trước khi đề xuất được tạo).",
  VotingClosed: "Đề xuất đã hết hạn bỏ phiếu.",
  VotingNotStarted: "Đề xuất chưa mở bỏ phiếu, vui lòng quay lại sau.",
  TimelockNotElapsed: "Đề xuất đang trong thời gian chờ an toàn, chưa thể giải ngân.",
  ProposalExpired: "Đề xuất đã quá thời hạn giải ngân.",
  ExceedsDisbursementCap: "Số ETH yêu cầu vượt trần giải ngân cho mỗi đề xuất so với số dư Quỹ hiện tại.",
  NotGuardian: "Chỉ guardian mới được huỷ đề xuất.",
  VotingNotEnded: "Chưa hết thời gian bỏ phiếu, chưa thể thực thi đề xuất.",
  QuorumNotReached: "Đề xuất không đạt số phiếu tối thiểu nên không thể giải ngân.",
  AlreadyFinalized: "Đề xuất đã được thực thi hoặc chốt kết quả rồi.",
  BelowProposalThreshold: "Số dư ECO chưa đạt ngưỡng tối thiểu để tạo đề xuất.",
  ProposalNotFound: "Không tìm thấy đề xuất.",
  InsufficientBalance: "Quỹ bảo tồn biển không đủ ETH để giải ngân đề xuất này.",
  TransferFailed: "Không chuyển được ETH tới ví nhận.",
  NotGovernance: "Chỉ hợp đồng Governance mới được giải ngân từ Quỹ.",
  ZeroAmount: "Số tiền phải lớn hơn 0.",
  ZeroAddress: "Địa chỉ không hợp lệ (địa chỉ 0).",
};

const CONTRACT_ERROR_MESSAGES_EN: Record<string, string> = {
  ListingNotActive: "This product has already been sold or cancelled.",
  ListingNotFound: "Product not found.",
  InsufficientPayment: "The ETH sent is not enough to pay for this product.",
  NotSellerOrOwner: "Only the seller can cancel this product.",
  ZeroPrice: "The price must be greater than 0.",
  PriceBelowMinimum: "The price is below the Marketplace minimum.",
  ArtisanNotVerified: "Your wallet has not been verified as an artisan, so it cannot list products yet.",
  SelfPurchase: "You cannot buy your own product.",
  InvalidOrderStatus: "The order's status does not allow this action.",
  NotBuyer: "Only the buyer can do this.",
  NotSeller: "Only the seller can refund this order.",
  NotArbiter: "Only the arbiter can resolve disputes.",
  EscrowNotExpired: "The order's escrow period has not ended yet.",
  DisputeNotStale: "The dispute has not passed its handling deadline yet.",
  EnforcedPause: "This feature is temporarily paused for safety maintenance.",
  EmptyMetadataURI: "Product information (metadata) is missing.",
  RefundFailed: "The excess payment could not be returned to your wallet.",
  // CarbonOffset
  InvalidCarbonAmount: "Invalid CO₂ amount (from 1 kg to 100 tonnes per offset).",
  MetadataTooLong: "The badge information is too long.",
  AlreadyCompleted: "You have already claimed this quest's reward.",
  RequirementNotMet: "The quest requirement is not met yet (on-chain data may be behind, please retry in a few seconds).",
  QuestInactive: "This quest is currently paused.",
  QuestNotFound: "Quest not found.",
  TooManyProofIds: "Too many proof badges in one claim.",
  // Governance / CommunityTreasury
  AlreadyVoted: "You have already voted. Each wallet can vote once per proposal.",
  NoVotingPower:
    "This wallet had no voting power when the proposal was created (you need ECO and activated voting power before the proposal is created).",
  VotingClosed: "Voting on this proposal has ended.",
  VotingNotStarted: "Voting on this proposal has not opened yet, please come back later.",
  TimelockNotElapsed: "This proposal is still in its safety waiting period and cannot be disbursed yet.",
  ProposalExpired: "This proposal's disbursement window has expired.",
  ExceedsDisbursementCap: "The requested ETH exceeds the per-proposal disbursement cap for the current Treasury balance.",
  NotGuardian: "Only the guardian can cancel proposals.",
  VotingNotEnded: "Voting has not ended yet, so the proposal cannot be executed.",
  QuorumNotReached: "The proposal did not reach quorum (too few votes), so it cannot be executed.",
  AlreadyFinalized: "This proposal has already been executed or finalized.",
  BelowProposalThreshold: "Your ECO balance is below the minimum required to create a proposal.",
  ProposalNotFound: "Proposal not found.",
  InsufficientBalance: "The Ocean Conservation Fund does not have enough ETH to disburse this proposal.",
  TransferFailed: "The ETH could not be transferred to the recipient wallet.",
  NotGovernance: "Only the Governance contract can disburse from the Treasury.",
  ZeroAmount: "The amount must be greater than 0.",
  ZeroAddress: "Invalid address (zero address).",
};

/** viem throws this when a receipt doesn't arrive within the `timeout` option. */
export function isReceiptTimeoutError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "WaitForTransactionReceiptTimeoutError";
}

export function getTxErrorMessage(error: unknown, locale: Locale = "vi"): string {
  const messages = pick(locale, CONTRACT_ERROR_MESSAGES, CONTRACT_ERROR_MESSAGES_EN);
  // viem errors expose a cause chain; walk it looking for something recognisable.
  let current: unknown = error;
  for (let depth = 0; current && depth < 10; depth++) {
    const e = current as {
      name?: string;
      code?: number;
      data?: { errorName?: string };
      shortMessage?: string;
      cause?: unknown;
    };
    if (e.name === "UserRejectedRequestError" || e.code === 4001) {
      return pick(locale, "Bạn đã huỷ giao dịch trong ví.", "You cancelled the transaction in your wallet.");
    }
    const errorName = e.data?.errorName;
    if (errorName && messages[errorName]) {
      return messages[errorName];
    }
    if (e.name === "InsufficientFundsError") {
      return pick(locale, "Ví không đủ ETH để thanh toán và trả phí gas.", "Your wallet does not have enough ETH for the payment and gas.");
    }
    current = e.cause;
  }
  const short = (error as { shortMessage?: string })?.shortMessage;
  return short || pick(locale, "Giao dịch thất bại. Vui lòng thử lại.", "Transaction failed. Please try again.");
}
