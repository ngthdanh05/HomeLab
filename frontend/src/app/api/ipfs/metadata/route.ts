import { NextRequest } from "next/server";
import { getClientKey, jsonResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  LISTING_LIMITS,
  detectImageType,
  validateListingText,
} from "@/lib/marketplace";

export const runtime = "nodejs";

const ROUTE = "api/ipfs/metadata";
const PINATA_API = "https://api.pinata.cloud/pinning";
const RATE_LIMIT = { requests: 10, windowMs: 60_000 };

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
  const limit = checkRateLimit(getClientKey(request, ROUTE), RATE_LIMIT.requests, RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return jsonResponse(
      { error: "Bạn tải lên quá nhiều lần. Vui lòng thử lại sau ít phút." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return jsonResponse({ error: "IPFS chưa được cấu hình (PINATA_JWT).", code: "IPFS_DISABLED" }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > LISTING_LIMITS.imageBytes + 64 * 1024) {
    return jsonResponse({ error: "Ảnh tối đa 2MB." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "Dữ liệu gửi lên không hợp lệ." }, 400);
  }

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const textError = validateListingText(name, description);
  if (textError) return jsonResponse({ error: textError }, 400);

  try {
    let image: string | undefined;
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > LISTING_LIMITS.imageBytes) {
        return jsonResponse({ error: "Ảnh tối đa 2MB." }, 413);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = detectImageType(bytes);
      if (!type) {
        return jsonResponse({ error: "Chỉ hỗ trợ ảnh PNG, JPEG, GIF hoặc WebP." }, 415);
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
    return jsonResponse({ error: "Không tải được dữ liệu lên IPFS. Vui lòng thử lại." }, 502);
  }
}
