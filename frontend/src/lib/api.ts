import type { NextRequest } from "next/server";
import { isApiKeyError, isGeminiConfigured } from "./gemini";
import { rateLimit } from "./rate-limit";
import { ValidationError } from "./ai-validation";
import { LOCALE_COOKIE, normalizeLocale, pick, type Locale } from "./i18n";

// Chat history can hold several Vietnamese messages (up to 3 bytes per character).
const MAX_BODY_BYTES = 40 * 1024;
const RATE_LIMIT = { requests: 20, windowMs: 60_000 };
const DAY_MS = 24 * 60 * 60 * 1000;
/** All AI routes together; caps the Gemini bill when many IPs are used. */
const DEFAULT_AI_DAILY_LIMIT = 5_000;

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

/** Language chosen in the header (the cookie is sent with same-origin fetches). */
export function getRequestLocale(request: NextRequest): Locale {
  return normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
}

export function getClientKey(request: NextRequest, route: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${route}:${ip}`;
}

// Shared guard for AI routes: rate limit, service config, and a size-capped
// JSON body. Returns either the parsed body or an error Response to send.
export async function readAIRequest(
  request: NextRequest,
  route: string,
): Promise<{ body: unknown } | { error: Response }> {
  const locale = getRequestLocale(request);
  const limit = await rateLimit(
    getClientKey(request, route),
    RATE_LIMIT.requests,
    RATE_LIMIT.windowMs,
  );
  if (!limit.allowed) {
    return {
      error: jsonResponse(
        { error: pick(locale, "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.", "Too many requests. Please try again in a few minutes.") },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      ),
    };
  }

  const dailyLimit = Number(process.env.AI_DAILY_LIMIT) || DEFAULT_AI_DAILY_LIMIT;
  const budget = await rateLimit("ai:global", dailyLimit, DAY_MS);
  if (!budget.allowed) {
    return {
      error: jsonResponse(
        { error: pick(locale, "Dịch vụ AI đã đạt giới hạn trong ngày. Vui lòng quay lại sau.", "The AI service has reached its daily limit. Please come back later.") },
        503,
        { "Retry-After": String(budget.retryAfterSeconds) },
      ),
    };
  }

  if (!isGeminiConfigured()) {
    return {
      error: jsonResponse(
        { error: pick(locale, "Dịch vụ AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.", "The AI service is not configured. Please contact the administrator.") },
        503,
      ),
    };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return { error: jsonResponse({ error: pick(locale, "Yêu cầu quá lớn.", "The request is too large.") }, 413) };
  }

  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: jsonResponse({ error: pick(locale, "Body phải là JSON hợp lệ.", "The body must be valid JSON.") }, 400) };
  }
}

// Maps an error to a friendly response without leaking internal details.
export function errorResponse(error: unknown, route: string, fallback: string, locale: Locale = "vi"): Response {
  if (error instanceof ValidationError) {
    return jsonResponse({ error: error.message }, 400);
  }

  console.error(`[${route}]`, error);

  const upstreamStatus = (error as { status?: unknown } | null)?.status;
  // 504 = GeminiTimeoutError (model hanging under load).
  if (upstreamStatus === 429 || upstreamStatus === 503 || upstreamStatus === 504) {
    return jsonResponse(
      { error: pick(locale, "Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.", "The AI service is overloaded. Please try again in a few minutes.") },
      503,
      { "Retry-After": "30" },
    );
  }

  if (isApiKeyError(error)) {
    return jsonResponse(
      { error: pick(locale, "API key không hợp lệ. Vui lòng kiểm tra cấu hình GEMINI_API_KEY.", "Invalid API key. Please check the GEMINI_API_KEY setting.") },
      502,
    );
  }

  return jsonResponse({ error: fallback }, 500);
}
