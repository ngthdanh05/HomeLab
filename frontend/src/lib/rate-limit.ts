// Fixed-window rate limiter protecting the Gemini quota and Pinata uploads.
// `rateLimit()` uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set
// (shared across Vercel instances); `checkRateLimit()` is the in-memory fallback,
// kept per server instance.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still full of live keys: drop everything rather than grow without bound.
  if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
}

export function resetRateLimits() {
  buckets.clear();
}

// ───────────────────────── Shared store (production) ─────────────────────────

export interface RedisConfig {
  url: string;
  token: string;
}

/**
 * Upstash Redis REST credentials (Vercel's Upstash integration sets the KV_* names).
 * Without them every serverless instance keeps its own counters, which barely
 * limits anything on Vercel.
 */
export function getRedisConfig(env: Record<string, string | undefined> = process.env): RedisConfig | null {
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)?.trim();
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

const REDIS_TIMEOUT_MS = 1_500;

/**
 * Fixed-window counter in Redis: INCR, set the expiry on the first hit (NX), read the TTL.
 * One REST round trip (pipeline); works in the Edge and Node runtimes.
 */
export async function checkRateLimitRedis(
  config: RedisConfig,
  key: string,
  limit: number,
  windowMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const response = await fetchImpl(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(windowMs), "NX"],
      ["PTTL", redisKey],
    ]),
    signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Upstash ${response.status}`);
  const results = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(`Upstash: ${failed.error}`);

  const count = Number(results[0]?.result);
  const ttlMs = Number(results[2]?.result);
  if (!Number.isFinite(count)) throw new Error("Upstash: unexpected INCR result");
  if (count <= limit) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000)) };
}

/**
 * Rate limit for API routes: Redis when configured, otherwise the in-memory
 * limiter. If Redis is unreachable it falls back to memory rather than failing
 * the request (a Redis outage must not take the AI features down).
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const config = getRedisConfig();
  if (config) {
    try {
      return await checkRateLimitRedis(config, key, limit, windowMs);
    } catch (error) {
      console.error("Rate limit store unavailable, using in-memory limiter:", error);
    }
  }
  return checkRateLimit(key, limit, windowMs);
}
