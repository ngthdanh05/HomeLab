import { NextRequest } from "next/server";
import { createPublicClient, fallback, http, isAddress, type Address, type Hex } from "viem";
import { anvil, sepolia } from "viem/chains";
import { DEFAULT_CHAIN_ID, MarketplaceABI, getContractAddresses } from "@/config/contracts";
import { getClientKey, getRequestLocale, jsonResponse } from "@/lib/api";
import { normalizeLocale, pick } from "@/lib/i18n";
import { rateLimit } from "@/lib/rate-limit";
import { getSepoliaRpcUrls } from "@/lib/rpc";
import {
  buildUploadMessage,
  isFreshUploadTimestamp,
  LISTING_LIMITS,
  detectImageType,
  validateListingText,
} from "@/lib/marketplace";

export const runtime = "nodejs";

const ROUTE = "api/ipfs/metadata";
const PINATA_API = "https://api.pinata.cloud/pinning";
const RATE_LIMIT = { requests: 10, windowMs: 60_000 };

const WALLET_RATE_LIMIT = { requests: 5, windowMs: 60_000 };

const client = createPublicClient({
  chain: DEFAULT_CHAIN_ID === anvil.id ? anvil : sepolia,
  transport:
    DEFAULT_CHAIN_ID === anvil.id
      ? http("http://127.0.0.1:8545")
      : fallback(getSepoliaRpcUrls(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL).map((url) => http(url, { timeout: 8_000 }))),
});

/** Only verified artisans can list, so only they may pin. Unreadable rules (older deployment, RPC outage) allow. */
async function canList(address: Address): Promise<boolean> {
  const market = { address: getContractAddresses(DEFAULT_CHAIN_ID).marketplace, abi: MarketplaceABI } as const;
  try {
    const [required, verified] = await Promise.all([
      client.readContract({ ...market, functionName: "artisanVerificationRequired" }),
      client.readContract({ ...market, functionName: "verifiedArtisan", args: [address] }),
    ]);
    return required !== true || verified === true;
  } catch (error) {
    console.error(`[${ROUTE}] cannot read artisan rules`, error);
    return true;
  }
}

async function pinata(path: string, body: BodyInit, jwt: string, json = false) {
  const response = await fetch(`${PINATA_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Pinata ${path} failed: ${response.status}`);
  const { IpfsHash } = (await response.json()) as { IpfsHash: string };
  return `ipfs://${IpfsHash}`;
}

/**
 * Pins listing metadata (and an optional product image) to IPFS via Pinata.
 * The Pinata JWT stays server-side; the browser only receives the ipfs:// URI.
 */
export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const limit = await rateLimit(getClientKey(request, ROUTE), RATE_LIMIT.requests, RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return jsonResponse(
      { error: pick(locale, "Bạn tải lên quá nhiều lần. Vui lòng thử lại sau ít phút.", "Too many uploads. Please try again in a few minutes.") },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return jsonResponse({ error: pick(locale, "IPFS chưa được cấu hình (PINATA_JWT).", "IPFS is not configured (PINATA_JWT)."), code: "IPFS_DISABLED" }, 503);
  }

  const imageTooLarge = pick(locale, "Ảnh tối đa 2MB.", "Images can be at most 2 MB.");
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > LISTING_LIMITS.imageBytes + 64 * 1024) {
    return jsonResponse({ error: imageTooLarge }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: pick(locale, "Dữ liệu gửi lên không hợp lệ.", "The submitted data is invalid.") }, 400);
  }

  const badSignature = pick(locale, "Chữ ký tải lên không hợp lệ hoặc đã hết hạn.", "The upload signature is invalid or has expired.");

  const address = String(form.get("address") ?? "");
  const timestamp = Number(form.get("timestamp"));
  const signature = String(form.get("signature") ?? "") as Hex;
  if (!isAddress(address) || !isFreshUploadTimestamp(timestamp)) {
    return jsonResponse({ error: badSignature }, 401);
  }
  let signed = false;
  try {
    // The signed text is in the language the wallet showed, which the client sends with the form.
    const message = buildUploadMessage(address, timestamp, normalizeLocale(form.get("locale")));
    signed = await client.verifyMessage({ address, message, signature });
  } catch {
    signed = false;
  }
  if (!signed) return jsonResponse({ error: badSignature }, 401);

  const walletLimit = await rateLimit(`${ROUTE}:${address.toLowerCase()}`, WALLET_RATE_LIMIT.requests, WALLET_RATE_LIMIT.windowMs);
  if (!walletLimit.allowed) {
    return jsonResponse(
      { error: pick(locale, "Ví này tải lên quá nhiều lần. Vui lòng thử lại sau ít phút.", "This wallet has uploaded too many times. Please try again in a few minutes.") },
      429,
      { "Retry-After": String(walletLimit.retryAfterSeconds) },
    );
  }
  if (!(await canList(address))) {
    return jsonResponse({ error: pick(locale, "Ví của bạn chưa được xác thực là nghệ nhân.", "Your wallet has not been verified as an artisan.") }, 403);
  }

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const textError = validateListingText(name, description, locale);
  if (textError) return jsonResponse({ error: textError }, 400);

  try {
    let image: string | undefined;
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > LISTING_LIMITS.imageBytes) {
        return jsonResponse({ error: imageTooLarge }, 413);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = detectImageType(bytes);
      if (!type) {
        return jsonResponse({ error: pick(locale, "Chỉ hỗ trợ ảnh PNG, JPEG, GIF hoặc WebP.", "Only PNG, JPEG, GIF or WebP images are supported.") }, 415);
      }
      const upload = new FormData();
      upload.append("file", new Blob([bytes], { type }), "product");
      image = await pinata("pinFileToIPFS", upload, jwt);
    }

    const uri = await pinata(
      "pinJSONToIPFS",
      JSON.stringify({
        pinataContent: { name, description, ...(image ? { image } : {}) },
        pinataMetadata: { name: `listing-${name.slice(0, 40)}` },
      }),
      jwt,
      true,
    );
    return jsonResponse({ uri });
  } catch (error) {
    console.error(`[${ROUTE}]`, error);
    return jsonResponse({ error: pick(locale, "Không tải được dữ liệu lên IPFS. Vui lòng thử lại.", "Could not upload the data to IPFS. Please try again.") }, 502);
  }
}
