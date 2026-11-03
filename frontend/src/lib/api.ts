import type { NextRequest } from "next/server";
import { isApiKeyError, isGeminiConfigured } from "./gemini";
import { checkRateLimit } from "./rate-limit";
import { ValidationError } from "./ai-validation";

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = { requests: 20, windowMs: 60_000 };

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function getClientKey(request: NextRequest, route: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || request.ip || "unknown";
  return `${route}:${ip}`;
}

// Shared guard for AI routes: rate limit, service config, and a size-capped
// JSON body. Returns either the parsed body or an error Response to send.
export async function readAIRequest(
  request: NextRequest,
  route: string,
): Promise<{ body: unknown } | { error: Response }> {
  const limit = checkRateLimit(
    getClientKey(request, route),
    RATE_LIMIT.requests,
    RATE_LIMIT.windowMs,
  );
  if (!limit.allowed) {
    return {
      error: jsonResponse(
        { error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      ),
    };
  }

  if (!isGeminiConfigured()) {
    return {
      error: jsonResponse(
        { error: "Dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị viên." },
        503,
      ),
    };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return { error: jsonResponse({ error: "Yêu cầu quá lớn." }, 413) };
  }

  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: jsonResponse({ error: "Body phải là JSON hợp lệ." }, 400) };
  }
}

// Maps an error to a friendly response without leaking internal details.
export function errorResponse(error: unknown, route: string, fallback: string): Response {
  if (error instanceof ValidationError) {
    return jsonResponse({ error: error.message }, 400);
  }

  console.error(`[${route}]`, error);

  const upstreamStatus = (error as { status?: unknown } | null)?.status;
  if (upstreamStatus === 429 || upstreamStatus === 503) {
    return jsonResponse(
      { error: "Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút." },
      503,
      { "Retry-After": "30" },
    );
  }

  if (isApiKeyError(error)) {
    return jsonResponse(
      { error: "API key không hợp lệ. Vui lòng kiểm tra cấu hình GEMINI_API_KEY." },
      502,
    );
  }

  return jsonResponse({ error: fallback }, 500);
}
