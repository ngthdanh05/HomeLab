// Framework-free helpers for the D2C marketplace (unit-tested with plain Node).

/** Mirrors `enum ProductType` in contracts/src/interfaces/IMarketPlaceDeps.sol. */
export const PRODUCT_TYPES = [
  { value: 0, label: "Đồ thủ công", icon: "🧺" },
  { value: 1, label: "Đặc sản địa phương", icon: "🍯" },
  { value: 2, label: "Tour trải nghiệm", icon: "🧭" },
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

export interface ListingMetadata {
  name: string;
  description: string;
  image?: string;
}

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

export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
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

const MAX_TEXT = { name: 120, description: 2000 } as const;

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
  };
}

/** Decodes metadata stored inline as `data:application/json;base64,...`. */
export function decodeDataJsonUri(uri: string): unknown {
  const match = /^data:application\/json(?:;charset=utf-8)?;base64,(.+)$/i.exec(uri);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

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
  return response.json();
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
export function validateListingText(name: string, description: string): string | null {
  if (!name.trim()) return "Vui lòng nhập tên sản phẩm.";
  if (name.length > LISTING_LIMITS.name) {
    return `Tên tối đa ${LISTING_LIMITS.name} ký tự.`;
  }
  if (description.length > LISTING_LIMITS.description) {
    return `Mô tả tối đa ${LISTING_LIMITS.description} ký tự.`;
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
  EmptyMetadataURI: "Thiếu thông tin sản phẩm (metadata).",
  RefundFailed: "Không hoàn lại được tiền thừa cho ví của bạn.",
  // CarbonOffset
  InvalidCarbonAmount: "Lượng CO₂ bù đắp không hợp lệ (tối đa 100 tấn mỗi lần).",
  MetadataTooLong: "Thông tin badge quá dài.",
};

/** viem throws this when a receipt doesn't arrive within the `timeout` option. */
export function isReceiptTimeoutError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "WaitForTransactionReceiptTimeoutError";
}

export function getTxErrorMessage(error: unknown): string {
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
      return "Bạn đã huỷ giao dịch trong ví.";
    }
    const errorName = e.data?.errorName;
    if (errorName && CONTRACT_ERROR_MESSAGES[errorName]) {
      return CONTRACT_ERROR_MESSAGES[errorName];
    }
    if (e.name === "InsufficientFundsError") {
      return "Ví không đủ ETH để thanh toán và trả phí gas.";
    }
    current = e.cause;
  }
  const short = (error as { shortMessage?: string })?.shortMessage;
  return short || "Giao dịch thất bại. Vui lòng thử lại.";
}
